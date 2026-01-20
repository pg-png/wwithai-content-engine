/**
 * Photo Handler
 * Handles incoming photos and initiates theme selection flow
 */

const { v4: uuidv4 } = require('uuid');
const { processImage } = require('../../services/n8n');
const { logContentEntry } = require('../../services/notion');
const { themeKeyboard, approvalKeyboard } = require('../keyboards/approval');
const { logger, logUserAction, logProgress } = require('../../utils/logger');
const { config } = require('../../utils/config');

// Store for pending content (in-memory, replace with Redis in production)
const pendingContent = new Map();

// Progress messages (French)
const PROGRESS_MESSAGES = {
  received: '📸 Photo reçue! Choisis l\'ambiance:',
  analyzing: '🔍 Analyse du plat en cours...',
  enhancing: '✨ Transformation de l\'image...',
  generating: '✍️ Génération de la caption...',
  finalizing: '🎯 Finalisation...',
};

/**
 * Handle incoming photo - show theme selection
 */
async function handlePhoto(ctx) {
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;
  const contentId = uuidv4().substring(0, 8);

  logUserAction(userId, 'photo_received', { contentId });
  logProgress(userId, 'Photo received', 'started');

  try {
    // Get the highest quality photo
    const photos = ctx.message.photo;
    const photo = photos[photos.length - 1]; // Largest size
    const fileId = photo.file_id;

    logger.info('Photo received, awaiting theme selection', {
      userId,
      contentId,
      fileId: fileId.substring(0, 20) + '...',
      width: photo.width,
      height: photo.height,
    });

    // Get file URL from Telegram
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const imageUrl = fileLink.href;

    // Store photo info for later processing (when theme is selected)
    pendingContent.set(contentId, {
      userId,
      chatId,
      originalUrl: imageUrl,
      fileId,
      width: photo.width,
      height: photo.height,
      restaurantName: ctx.from.first_name || 'Restaurant',
      createdAt: new Date().toISOString(),
      status: 'awaiting_theme',
    });

    // Show theme selection keyboard
    await ctx.reply(PROGRESS_MESSAGES.received, {
      reply_markup: themeKeyboard(contentId).reply_markup,
    });

    logProgress(userId, 'Theme selection shown', 'waiting');
  } catch (error) {
    logger.error('Photo handler error', {
      userId,
      error: error.message,
    });

    await ctx.reply(
      '😔 Oups! Une erreur est survenue.\n\n' +
      'Essaie à nouveau avec une autre photo.'
    );
  }
}

/**
 * Process photo with selected theme
 * Called from callback handler when user selects a theme
 */
async function processWithTheme(ctx, contentId, theme) {
  const content = pendingContent.get(contentId);

  if (!content) {
    await ctx.answerCbQuery('⚠️ Photo expirée. Renvoie ta photo.');
    return;
  }

  const { userId, chatId, originalUrl, restaurantName } = content;
  const startTime = Date.now();

  logUserAction(userId, 'theme_selected', { contentId, theme });
  logProgress(userId, `Processing with theme: ${theme}`, 'started');

  try {
    // Answer callback immediately
    await ctx.answerCbQuery('⏳ Transformation en cours...');

    // Edit the theme selection message to show progress
    await ctx.editMessageText('⏳ Transformation en cours...\n\n🔍 Analyse du plat...');

    // Process through n8n workflow with theme
    const result = await processImage({
      imageUrl: originalUrl,
      userId: String(userId),
      chatId: String(chatId),
      restaurantName,
      theme, // Pass the selected theme
    });

    const processingTimeMs = Date.now() - startTime;

    if (!result.success) {
      throw new Error(result.error || 'Processing failed');
    }

    // Extract result data
    const {
      enhancedUrl = originalUrl,
      caption = generateFallbackCaption(theme),
      hashtags = getDefaultHashtags(theme),
      analysis = {},
    } = result.data || {};

    // Update stored content with results
    pendingContent.set(contentId, {
      ...content,
      enhancedUrl,
      caption,
      hashtags,
      analysis,
      theme,
      processingTimeMs,
      status: 'pending_approval',
    });

    // Log to Notion
    logContentEntry({
      userId: String(userId),
      restaurantName,
      status: 'pending',
      caption,
      theme,
      processingTimeMs,
      platforms: ['instagram'],
    }).catch(err => logger.warn('Notion logging failed', { error: err.message }));

    // Delete progress message
    await ctx.deleteMessage();

    // Send enhanced image with caption
    const fullCaption = formatCaption(caption, hashtags);

    await ctx.replyWithPhoto(
      { url: enhancedUrl },
      {
        caption: `✨ *Voici ta photo transformée!*\n\n${fullCaption}\n\n⏱ Généré en ${Math.round(processingTimeMs / 1000)}s`,
        parse_mode: 'Markdown',
        reply_markup: approvalKeyboard(contentId).reply_markup,
      }
    );

    logProgress(userId, 'Photo processing', 'completed');
    logger.info('Content generated successfully', {
      userId,
      contentId,
      theme,
      processingTimeMs,
    });
  } catch (error) {
    logProgress(userId, 'Photo processing', 'failed');
    logger.error('Photo processing failed', {
      userId,
      contentId,
      theme,
      error: error.message,
    });

    // Try to delete progress message
    try {
      await ctx.deleteMessage();
    } catch (e) {
      // Ignore deletion errors
    }

    await ctx.reply(
      `😔 Oups! Une erreur est survenue.\n\n` +
      `Essaie à nouveau avec une autre photo, ou vérifie que:\n` +
      `• La photo n'est pas trop grande (< 10MB)\n` +
      `• La connexion internet est stable\n\n` +
      `Si le problème persiste, contacte @wwithai`
    );
  }
}

/**
 * Format caption with hashtags
 */
function formatCaption(caption, hashtags) {
  const hashtagString = Array.isArray(hashtags) ? hashtags.join(' ') : hashtags;
  return `${caption}\n\n${hashtagString}`;
}

/**
 * Generate a fallback caption when AI fails
 */
function generateFallbackCaption(theme) {
  const fallbacks = {
    brunch: 'Le brunch parfait pour commencer la journée ☀️',
    lunch: 'Pause lunch bien méritée 🍽️',
    dinner: 'Une soirée qui s\'annonce délicieuse 🌙',
    event: 'Moment de célébration! 🎉',
    royal: 'Un repas digne de la royauté thaïlandaise 👑',
  };
  return fallbacks[theme] || 'Fraîchement préparé avec amour ❤️';
}

/**
 * Get default hashtags based on theme
 */
function getDefaultHashtags(theme) {
  const hashtagSets = {
    brunch: ['#brunchmontreal', '#weekendvibes', '#foodiemtl', '#thaifood'],
    lunch: ['#lunchmtl', '#pauselunch', '#foodporn', '#mtlfood'],
    dinner: ['#dinnerdate', '#finedining', '#mtlrestaurants', '#thaicuisine'],
    event: ['#celebration', '#eventmtl', '#foodcatering', '#partyfood'],
    royal: ['#royalthai', '#authenticthai', '#thaiculture', '#luxurydining'],
  };
  return hashtagSets[theme] || ['#foodie', '#restaurant', '#bonappetit'];
}

/**
 * Get pending content by ID
 */
function getPendingContent(contentId) {
  return pendingContent.get(contentId);
}

/**
 * Update pending content
 */
function updatePendingContent(contentId, updates) {
  const content = pendingContent.get(contentId);
  if (content) {
    pendingContent.set(contentId, { ...content, ...updates });
  }
}

/**
 * Delete pending content
 */
function deletePendingContent(contentId) {
  pendingContent.delete(contentId);
}

/**
 * Handle document (file) uploads
 */
async function handleDocument(ctx) {
  const document = ctx.message.document;
  const mimeType = document.mime_type || '';

  // Check if it's an image
  if (mimeType.startsWith('image/')) {
    // Get file link and process as photo
    const fileLink = await ctx.telegram.getFileLink(document.file_id);

    // Create a fake photo context
    ctx.message.photo = [{
      file_id: document.file_id,
      width: 0,
      height: 0,
    }];

    return handlePhoto(ctx);
  }

  await ctx.reply(
    '⚠️ Je ne peux traiter que des images.\n' +
    'Envoie-moi une photo de ton plat!'
  );
}

module.exports = {
  handlePhoto,
  handleDocument,
  processWithTheme,
  getPendingContent,
  updatePendingContent,
  deletePendingContent,
};

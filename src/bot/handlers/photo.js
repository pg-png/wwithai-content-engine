/**
 * Photo Handler
 * Core functionality - processes incoming photos and generates content
 */

const { v4: uuidv4 } = require('uuid');
const { processImage } = require('../../services/n8n');
const { logContentEntry } = require('../../services/notion');
const { approvalKeyboard } = require('../keyboards/approval');
const { logger, logUserAction, logProgress } = require('../../utils/logger');
const { config } = require('../../utils/config');

// Store for pending content (in-memory, replace with Redis in production)
const pendingContent = new Map();

// Progress messages
const PROGRESS_MESSAGES = {
  received: '📸 Photo reçue! Je travaille dessus...',
  analyzing: '🔍 Analyse du plat en cours...',
  enhancing: '✨ Amélioration de l\'image...',
  generating: '✍️ Génération de la caption...',
  finalizing: '🎯 Finalisation...',
};

/**
 * Handle incoming photo
 */
async function handlePhoto(ctx) {
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;
  const contentId = uuidv4().substring(0, 8);
  const startTime = Date.now();

  logUserAction(userId, 'photo_received', { contentId });
  logProgress(userId, 'Photo processing', 'started');

  try {
    // Send initial progress message
    const progressMsg = await ctx.reply(PROGRESS_MESSAGES.received);

    // Get the highest quality photo
    const photos = ctx.message.photo;
    const photo = photos[photos.length - 1]; // Largest size
    const fileId = photo.file_id;

    logger.info('Processing photo', {
      userId,
      contentId,
      fileId: fileId.substring(0, 20) + '...',
      width: photo.width,
      height: photo.height,
    });

    // Get file URL from Telegram
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const imageUrl = fileLink.href;

    // Update progress
    await ctx.telegram.editMessageText(
      chatId,
      progressMsg.message_id,
      null,
      PROGRESS_MESSAGES.analyzing
    );

    // Process through n8n workflow
    const result = await processImage({
      imageUrl,
      userId: String(userId),
      chatId: String(chatId),
      restaurantName: ctx.from.first_name || 'Restaurant',
    });

    const processingTimeMs = Date.now() - startTime;

    if (!result.success) {
      throw new Error(result.error || 'Processing failed');
    }

    // Extract result data
    const {
      enhancedUrl = imageUrl,
      caption = generateFallbackCaption(),
      hashtags = ['#foodie', '#restaurant', '#bonappetit'],
      analysis = {},
    } = result.data || {};

    // Store pending content for later actions
    pendingContent.set(contentId, {
      userId,
      chatId,
      originalUrl: imageUrl,
      enhancedUrl,
      caption,
      hashtags,
      analysis,
      processingTimeMs,
      createdAt: new Date().toISOString(),
    });

    // Log to Notion
    logContentEntry({
      userId: String(userId),
      restaurantName: ctx.from.first_name || 'Restaurant',
      status: 'pending',
      caption,
      processingTimeMs,
      platforms: ['instagram'],
    }).catch(err => logger.warn('Notion logging failed', { error: err.message }));

    // Delete progress message
    await ctx.telegram.deleteMessage(chatId, progressMsg.message_id);

    // Send enhanced image with caption
    const fullCaption = formatCaption(caption, hashtags);

    await ctx.replyWithPhoto(
      { url: enhancedUrl },
      {
        caption: `✨ *Voici ton post!*\n\n${fullCaption}\n\n⏱ Généré en ${Math.round(processingTimeMs / 1000)}s`,
        parse_mode: 'Markdown',
        reply_markup: approvalKeyboard(contentId).reply_markup,
      }
    );

    logProgress(userId, 'Photo processing', 'completed');
    logger.info('Content generated successfully', {
      userId,
      contentId,
      processingTimeMs,
    });
  } catch (error) {
    logProgress(userId, 'Photo processing', 'failed');
    logger.error('Photo processing failed', {
      userId,
      contentId,
      error: error.message,
    });

    // Send user-friendly error message
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
  const hashtagString = hashtags.join(' ');
  return `${caption}\n\n${hashtagString}`;
}

/**
 * Generate a fallback caption when AI fails
 */
function generateFallbackCaption() {
  const fallbacks = [
    'Fresh sorti de la cuisine! 🍽️',
    'Le chef vous a préparé quelque chose de spécial...',
    'Fraîchement préparé avec amour ❤️',
    'On vous attend pour déguster!',
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
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
    // Convert to photo format and process
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
  getPendingContent,
  updatePendingContent,
  deletePendingContent,
};

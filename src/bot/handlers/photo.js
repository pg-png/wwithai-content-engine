/**
 * Photo Handler
 * Handles incoming photos with decor upload, theme and angle selection flow
 *
 * FLOW (v2.0):
 * 1. Food photo received → Ask about decor upload (optional)
 * 2. If yes → Accept 1-3 decor photos → "Done" button
 * 3. Show theme selection (Brunch/Lunch/Dinner/Event/Royal)
 * 4. Show angle selection (45°/Overhead/Eye-level/3-4)
 * 5. Process with n8n workflow
 * 6. Show result with approval keyboard
 */

const { v4: uuidv4 } = require('uuid');
const { processImage } = require('../../services/n8n');
const { logContentEntry } = require('../../services/notion');
const {
  decorPromptKeyboard,
  decorDoneKeyboard,
  themeKeyboard,
  angleKeyboard,
  approvalKeyboard,
  imageFeedbackKeyboard
} = require('../keyboards/approval');
const { logger, logUserAction, logProgress } = require('../../utils/logger');
const { config } = require('../../utils/config');

// Store for pending content (in-memory, replace with Redis in production)
const pendingContent = new Map();

// Session states
const SESSION_STATES = {
  AWAITING_DECOR_CHOICE: 'awaiting_decor_choice',
  COLLECTING_DECOR: 'collecting_decor',
  AWAITING_THEME: 'awaiting_theme',
  AWAITING_ANGLE: 'awaiting_angle',
  PROCESSING: 'processing',
  AWAITING_IMAGE_FEEDBACK: 'awaiting_image_feedback',
  PENDING_APPROVAL: 'pending_approval',
};

/**
 * Handle incoming photo - determine if it's food or decor based on session state
 */
async function handlePhoto(ctx) {
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;

  // Check if user has an active session waiting for decor photos
  const activeSession = findActiveSession(userId, SESSION_STATES.COLLECTING_DECOR);

  if (activeSession) {
    return handleDecorPhoto(ctx, activeSession.contentId);
  }

  // New food photo - start new session
  return handleFoodPhoto(ctx);
}

/**
 * Find active session for user in specific state
 */
function findActiveSession(userId, state) {
  for (const [contentId, content] of pendingContent.entries()) {
    if (content.userId === userId && content.status === state) {
      return { contentId, content };
    }
  }
  return null;
}

/**
 * Handle new food photo - start session flow
 */
async function handleFoodPhoto(ctx) {
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;
  const contentId = uuidv4().substring(0, 8);

  logUserAction(userId, 'food_photo_received', { contentId });
  logProgress(userId, 'Food photo received', 'started');

  try {
    // Get the highest quality photo
    const photos = ctx.message.photo;
    const photo = photos[photos.length - 1];
    const fileId = photo.file_id;

    logger.info('Food photo received', {
      userId,
      contentId,
      fileId: fileId.substring(0, 20) + '...',
      width: photo.width,
      height: photo.height,
    });

    // Get file URL from Telegram
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const imageUrl = fileLink.href;

    // Store session with food photo
    pendingContent.set(contentId, {
      userId,
      chatId,
      foodPhotoUrl: imageUrl,
      foodPhotoFileId: fileId,
      decorPhotos: [], // Will hold 0-3 decor photo URLs
      theme: null,
      angle: null,
      restaurantName: ctx.from.first_name || 'Restaurant',
      createdAt: new Date().toISOString(),
      status: SESSION_STATES.AWAITING_DECOR_CHOICE,
    });

    // Ask about decor photos
    await ctx.reply(
      '📸 *Photo reçue!*\n\n' +
      'Veux-tu ajouter des photos de ton décor/ambiance pour un meilleur résultat?\n' +
      '_(1-3 photos optionnelles de l\'intérieur de ton resto)_',
      {
        parse_mode: 'Markdown',
        reply_markup: decorPromptKeyboard(contentId).reply_markup,
      }
    );

    logProgress(userId, 'Decor choice shown', 'waiting');
  } catch (error) {
    logger.error('Food photo handler error', {
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
 * Handle decor photo addition
 */
async function handleDecorPhoto(ctx, contentId) {
  const content = pendingContent.get(contentId);
  const userId = ctx.from.id;

  if (!content) {
    await ctx.reply('⚠️ Session expirée. Envoie une nouvelle photo de plat.');
    return;
  }

  // Check limit
  if (content.decorPhotos.length >= 3) {
    await ctx.reply(
      '⚠️ Maximum 3 photos de décor atteint.\n' +
      'Clique sur "Terminé, continuer" pour passer à la suite.',
      { reply_markup: decorDoneKeyboard(contentId).reply_markup }
    );
    return;
  }

  try {
    const photos = ctx.message.photo;
    const photo = photos[photos.length - 1];
    const fileLink = await ctx.telegram.getFileLink(photo.file_id);

    // Add decor photo to session
    content.decorPhotos.push(fileLink.href);
    pendingContent.set(contentId, content);

    const count = content.decorPhotos.length;
    const remaining = 3 - count;

    logUserAction(userId, 'decor_photo_added', { contentId, count });

    if (remaining > 0) {
      await ctx.reply(
        `✅ Photo de décor ${count}/3 ajoutée!\n\n` +
        `Tu peux en ajouter ${remaining} de plus, ou continuer.`,
        { reply_markup: decorDoneKeyboard(contentId).reply_markup }
      );
    } else {
      await ctx.reply(
        `✅ 3 photos de décor ajoutées! Maximum atteint.\n\n` +
        `Clique pour continuer.`,
        { reply_markup: decorDoneKeyboard(contentId).reply_markup }
      );
    }
  } catch (error) {
    logger.error('Decor photo handler error', {
      userId,
      contentId,
      error: error.message,
    });
    await ctx.reply('😔 Erreur lors de l\'ajout. Réessaie.');
  }
}

/**
 * Handle decor choice callback (yes/skip/done)
 */
async function handleDecorChoice(ctx, contentId, choice) {
  const content = pendingContent.get(contentId);
  const userId = ctx.from.id;

  if (!content) {
    await ctx.answerCbQuery('⚠️ Session expirée');
    return;
  }

  logUserAction(userId, 'decor_choice', { contentId, choice });

  if (choice === 'yes') {
    // User wants to add decor photos
    content.status = SESSION_STATES.COLLECTING_DECOR;
    pendingContent.set(contentId, content);

    await ctx.answerCbQuery('📷 Envoie tes photos de décor');
    await ctx.editMessageText(
      '📷 *Envoie 1 à 3 photos de ton décor/ambiance*\n\n' +
      'Par exemple:\n' +
      '• L\'intérieur de ton restaurant\n' +
      '• Ta table typique\n' +
      '• L\'éclairage/ambiance\n\n' +
      '_Clique sur "Terminé" quand tu as fini._',
      {
        parse_mode: 'Markdown',
        reply_markup: decorDoneKeyboard(contentId).reply_markup,
      }
    );
  } else if (choice === 'skip' || choice === 'done') {
    // Skip decor or done collecting - move to theme selection
    content.status = SESSION_STATES.AWAITING_THEME;
    pendingContent.set(contentId, content);

    const decorCount = content.decorPhotos.length;
    const decorMsg = decorCount > 0
      ? `\n\n_${decorCount} photo(s) de décor en référence_`
      : '';

    await ctx.answerCbQuery(decorCount > 0 ? '✅ Décor enregistré' : '⏭️ Continué sans décor');
    await ctx.editMessageText(
      `🎨 *Choisis l'ambiance de ta photo:*${decorMsg}`,
      {
        parse_mode: 'Markdown',
        reply_markup: themeKeyboard(contentId).reply_markup,
      }
    );
  }
}

/**
 * Handle theme selection - move to angle selection
 */
async function handleThemeSelection(ctx, contentId, theme) {
  const content = pendingContent.get(contentId);
  const userId = ctx.from.id;

  if (!content) {
    await ctx.answerCbQuery('⚠️ Session expirée');
    return;
  }

  content.theme = theme;
  content.status = SESSION_STATES.AWAITING_ANGLE;
  pendingContent.set(contentId, content);

  logUserAction(userId, 'theme_selected', { contentId, theme });

  await ctx.answerCbQuery(`🎨 Thème: ${theme}`);
  await ctx.editMessageText(
    '📐 *Choisis l\'angle de prise de vue:*\n\n' +
    '• 45° Classique - idéal pour bols et assiettes\n' +
    '• Vue du haut - pour compositions et tables\n' +
    '• Niveau des yeux - pour plats hauts, burgers\n' +
    '• 3/4 Angle - polyvalent et naturel',
    {
      parse_mode: 'Markdown',
      reply_markup: angleKeyboard(contentId).reply_markup,
    }
  );
}

/**
 * Handle angle selection - start processing
 */
async function handleAngleSelection(ctx, contentId, angle) {
  const content = pendingContent.get(contentId);

  if (!content) {
    await ctx.answerCbQuery('⚠️ Session expirée');
    return;
  }

  content.angle = angle;
  content.status = SESSION_STATES.PROCESSING;
  pendingContent.set(contentId, content);

  // Start processing
  await processWithSettings(ctx, contentId);
}

/**
 * Process photo with all selected settings
 */
async function processWithSettings(ctx, contentId) {
  const content = pendingContent.get(contentId);

  if (!content) {
    await ctx.answerCbQuery('⚠️ Session expirée');
    return;
  }

  const { userId, chatId, foodPhotoUrl, decorPhotos, theme, angle, restaurantName } = content;
  const startTime = Date.now();
  const hasDecorReference = decorPhotos.length > 0;

  logUserAction(userId, 'processing_started', { contentId, theme, angle, decorCount: decorPhotos.length });
  logProgress(userId, `Processing: theme=${theme}, angle=${angle}`, 'started');

  try {
    await ctx.answerCbQuery('⏳ Transformation en cours...');
    await ctx.editMessageText(
      '⏳ *Transformation en cours...*\n\n' +
      '🔍 Analyse du plat...\n' +
      '✨ Application du style...',
      { parse_mode: 'Markdown' }
    );

    // Process through n8n workflow
    const result = await processImage({
      imageUrl: foodPhotoUrl,
      userId: String(userId),
      chatId: String(chatId),
      restaurantName,
      theme,
      angle,
      decorPhotos, // Pass decor photos for reference
      hasDecorReference,
    });

    const processingTimeMs = Date.now() - startTime;

    if (!result.success) {
      throw new Error(result.error || 'Processing failed');
    }

    // Extract result data
    const {
      enhancedUrl = foodPhotoUrl,
      caption = generateFallbackCaption(theme),
      hashtags = getDefaultHashtags(theme),
      analysis = {},
    } = result.data || {};

    // Update stored content with results - awaiting image feedback first
    const attempt = (content.attempts || 0) + 1;
    pendingContent.set(contentId, {
      ...content,
      enhancedUrl,
      caption,
      hashtags,
      analysis,
      processingTimeMs,
      attempts: attempt,
      status: SESSION_STATES.AWAITING_IMAGE_FEEDBACK,
    });

    // Log to Notion
    logContentEntry({
      userId: String(userId),
      restaurantName,
      status: 'pending',
      caption,
      theme,
      angle,
      hasDecorReference,
      processingTimeMs,
      platforms: ['instagram'],
    }).catch(err => logger.warn('Notion logging failed', { error: err.message }));

    // Delete progress message
    await ctx.deleteMessage();

    // Send enhanced image with feedback keyboard (not caption yet)
    await ctx.replyWithPhoto(
      { url: enhancedUrl },
      {
        caption: `✨ *Image générée* (tentative ${attempt})\n\n` +
          `🎨 Thème: ${theme}\n` +
          `📐 Angle: ${angle}\n` +
          `⏱ Généré en ${Math.round(processingTimeMs / 1000)}s\n\n` +
          `_Est-ce que cette image te convient?_`,
        parse_mode: 'Markdown',
        reply_markup: imageFeedbackKeyboard(contentId, attempt).reply_markup,
      }
    );

    logProgress(userId, 'Photo processing', 'completed');
    logger.info('Content generated successfully', {
      userId,
      contentId,
      theme,
      angle,
      hasDecorReference,
      processingTimeMs,
    });
  } catch (error) {
    logProgress(userId, 'Photo processing', 'failed');
    logger.error('Photo processing failed', {
      userId,
      contentId,
      theme,
      angle,
      error: error.message,
    });

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
    brunch: 'Le brunch parfait pour commencer la journée.',
    lunch: 'Pause lunch bien méritée.',
    dinner: 'Une soirée qui s\'annonce savoureuse.',
    event: 'Moment de célébration!',
    royal: 'Un repas digne de la tradition thaïlandaise.',
  };
  return fallbacks[theme] || 'Fraîchement préparé avec amour.';
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
 * Handle image approval - user likes the image, show caption
 */
async function handleImageOk(ctx, contentId) {
  const content = pendingContent.get(contentId);
  const userId = ctx.from.id;

  if (!content) {
    await ctx.answerCbQuery('⚠️ Session expirée');
    return;
  }

  logUserAction(userId, 'image_approved', { contentId, attempts: content.attempts });

  // Update status
  content.status = SESSION_STATES.PENDING_APPROVAL;
  pendingContent.set(contentId, content);

  await ctx.answerCbQuery('✅ Image approuvée!');

  // Now show the caption with approval keyboard
  const fullCaption = formatCaption(content.caption, content.hashtags);

  await ctx.editMessageCaption(
    `✨ *Voici ta photo transformée!*\n\n${fullCaption}\n\n` +
    `_Approuve pour copier la caption, ou modifie le texte._`,
    {
      parse_mode: 'Markdown',
      reply_markup: approvalKeyboard(contentId).reply_markup,
    }
  );
}

/**
 * Handle image retry - regenerate with variation
 */
async function handleImageRetry(ctx, contentId, retryType) {
  const content = pendingContent.get(contentId);
  const userId = ctx.from.id;

  if (!content) {
    await ctx.answerCbQuery('⚠️ Session expirée');
    return;
  }

  logUserAction(userId, 'image_retry', { contentId, retryType, attempts: content.attempts });

  // Handle different retry types
  if (retryType === 'style') {
    // Let user pick a new theme
    content.status = SESSION_STATES.AWAITING_THEME;
    pendingContent.set(contentId, content);

    await ctx.answerCbQuery('🎨 Choisis un nouveau style');
    await ctx.editMessageCaption(
      '🎨 *Choisis un nouveau style:*\n\n_L\'image sera régénérée avec ce thème._',
      {
        parse_mode: 'Markdown',
        reply_markup: themeKeyboard(contentId).reply_markup,
      }
    );
    return;
  }

  if (retryType === 'angle') {
    // Let user pick a new angle
    content.status = SESSION_STATES.AWAITING_ANGLE;
    pendingContent.set(contentId, content);

    await ctx.answerCbQuery('📐 Choisis un nouvel angle');
    await ctx.editMessageCaption(
      '📐 *Choisis un nouvel angle:*\n\n_L\'image sera régénérée avec cet angle._',
      {
        parse_mode: 'Markdown',
        reply_markup: angleKeyboard(contentId).reply_markup,
      }
    );
    return;
  }

  // Default: variation - regenerate with same settings but add variation prompt
  content.variationMode = true;
  content.status = SESSION_STATES.PROCESSING;
  pendingContent.set(contentId, content);

  await ctx.answerCbQuery('🔄 Génération d\'une variation...');

  // Delete the current image message
  await ctx.deleteMessage();

  // Reprocess with variation flag
  await processWithVariation(ctx, contentId);
}

/**
 * Process with variation - same settings but different output
 */
async function processWithVariation(ctx, contentId) {
  const content = pendingContent.get(contentId);

  if (!content) {
    await ctx.reply('⚠️ Session expirée. Envoie une nouvelle photo.');
    return;
  }

  const { userId, chatId, foodPhotoUrl, decorPhotos, theme, angle, restaurantName, attempts } = content;
  const startTime = Date.now();
  const hasDecorReference = decorPhotos.length > 0;

  logUserAction(userId, 'variation_started', { contentId, theme, angle, attempt: attempts + 1 });

  try {
    // Send progress message
    const progressMsg = await ctx.reply(
      '🔄 *Génération d\'une variation...*\n\n' +
      `Tentative ${attempts + 1}\n` +
      '✨ Création d\'un nouveau setup...',
      { parse_mode: 'Markdown' }
    );

    // Process through n8n workflow with variation flag
    const result = await processImage({
      imageUrl: foodPhotoUrl,
      userId: String(userId),
      chatId: String(chatId),
      restaurantName,
      theme,
      angle,
      decorPhotos,
      hasDecorReference,
      variation: true, // Signal to n8n to generate a variation
      attemptNumber: attempts + 1,
    });

    const processingTimeMs = Date.now() - startTime;

    if (!result.success) {
      throw new Error(result.error || 'Processing failed');
    }

    const {
      enhancedUrl = foodPhotoUrl,
      caption = generateFallbackCaption(theme),
      hashtags = getDefaultHashtags(theme),
      analysis = {},
    } = result.data || {};

    // Update stored content
    const newAttempt = attempts + 1;
    pendingContent.set(contentId, {
      ...content,
      enhancedUrl,
      caption,
      hashtags,
      analysis,
      processingTimeMs,
      attempts: newAttempt,
      variationMode: false,
      status: SESSION_STATES.AWAITING_IMAGE_FEEDBACK,
    });

    // Delete progress message
    await ctx.telegram.deleteMessage(chatId, progressMsg.message_id);

    // Send new image with feedback keyboard
    await ctx.replyWithPhoto(
      { url: enhancedUrl },
      {
        caption: `✨ *Nouvelle variation* (tentative ${newAttempt})\n\n` +
          `🎨 Thème: ${theme}\n` +
          `📐 Angle: ${angle}\n` +
          `⏱ Généré en ${Math.round(processingTimeMs / 1000)}s\n\n` +
          `_Est-ce que cette image te convient?_`,
        parse_mode: 'Markdown',
        reply_markup: imageFeedbackKeyboard(contentId, newAttempt).reply_markup,
      }
    );

    logger.info('Variation generated successfully', {
      userId,
      contentId,
      attempt: newAttempt,
      processingTimeMs,
    });
  } catch (error) {
    logger.error('Variation processing failed', {
      userId,
      contentId,
      error: error.message,
    });

    await ctx.reply(
      '😔 Erreur lors de la génération.\n\n' +
      'Essaie à nouveau ou envoie une nouvelle photo.'
    );
  }
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

  if (mimeType.startsWith('image/')) {
    const fileLink = await ctx.telegram.getFileLink(document.file_id);

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
  handleDecorChoice,
  handleThemeSelection,
  handleAngleSelection,
  handleImageOk,
  handleImageRetry,
  getPendingContent,
  updatePendingContent,
  deletePendingContent,
};

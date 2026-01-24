/**
 * CrowdMagic Photo Handler
 * Add AI-generated people to restaurant photos
 *
 * FLOW:
 * 1. Restaurant photo received → Show preset selection
 * 2. User picks preset → Process with n8n CrowdMagic workflow
 * 3. Show result → Allow retry or new photo
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { processImage } = require('../../services/n8n');
const {
  crowdMagicPresetsKeyboard,
  getPresetPrompt,
  mainMenuKeyboard,
} = require('../keyboards/approval');
const { logger, logUserAction, logProgress } = require('../../utils/logger');

// Store for pending content (in-memory)
const pendingContent = new Map();

// Session states
const SESSION_STATES = {
  AWAITING_PRESET: 'awaiting_preset',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
};

/**
 * Handle incoming photo
 */
async function handlePhoto(ctx) {
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;
  const contentId = uuidv4().substring(0, 8);

  logUserAction(userId, 'photo_received', { contentId });
  logProgress(userId, 'Restaurant photo received', 'started');

  try {
    // Get the highest quality photo
    const photos = ctx.message.photo;
    const photo = photos[photos.length - 1];
    const fileId = photo.file_id;

    logger.info('Restaurant photo received', {
      userId,
      contentId,
      fileId: fileId.substring(0, 20) + '...',
      width: photo.width,
      height: photo.height,
    });

    // Get file URL from Telegram
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const imageUrl = fileLink.href;

    // Download image and convert to base64
    const imageBase64 = await downloadImageAsBase64(imageUrl);

    // Store session
    pendingContent.set(contentId, {
      userId,
      chatId,
      imageBase64,
      imageUrl,
      preset: null,
      createdAt: new Date().toISOString(),
      status: SESSION_STATES.AWAITING_PRESET,
    });

    // Show preset selection
    await ctx.reply(
      '📸 *Photo reçue!*\n\n' +
      'Choisis le style de clients que tu veux ajouter:',
      {
        parse_mode: 'Markdown',
        reply_markup: crowdMagicPresetsKeyboard(contentId).reply_markup,
      }
    );

    logProgress(userId, 'Preset selection shown', 'waiting');
  } catch (error) {
    logger.error('Photo handler error', {
      userId,
      error: error.message,
    });

    await ctx.reply(
      '😔 Erreur lors du traitement de la photo.\n\n' +
      'Essaie avec une autre image (max 10MB).'
    );
  }
}

/**
 * Download image from URL and convert to base64
 */
async function downloadImageAsBase64(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
  });

  const base64 = Buffer.from(response.data).toString('base64');
  return base64;
}

/**
 * Handle preset selection
 */
async function handlePresetSelection(ctx, contentId, presetKey) {
  const content = pendingContent.get(contentId);
  const userId = ctx.from.id;

  if (!content) {
    await ctx.answerCbQuery('⚠️ Session expirée. Envoie une nouvelle photo.');
    return;
  }

  content.preset = presetKey;
  content.status = SESSION_STATES.PROCESSING;
  pendingContent.set(contentId, content);

  logUserAction(userId, 'preset_selected', { contentId, preset: presetKey });

  const presetLabels = {
    elegant: 'Elegant Diners',
    lunch: 'Busy Lunch',
    romantic: 'Romantic Evening',
    celebration: 'Group Celebration',
  };

  await ctx.answerCbQuery(`✨ ${presetLabels[presetKey]} sélectionné`);

  // Update message to show processing
  await ctx.editMessageText(
    '⏳ *Génération en cours...*\n\n' +
    `Style: ${presetLabels[presetKey]}\n\n` +
    '🎨 L\'IA ajoute des clients à ton restaurant...\n' +
    '_Cela prend environ 90 secondes_',
    { parse_mode: 'Markdown' }
  );

  // Process the image
  await processWithPreset(ctx, contentId);
}

/**
 * Process photo with selected preset
 */
async function processWithPreset(ctx, contentId) {
  const content = pendingContent.get(contentId);

  if (!content) {
    await ctx.reply('⚠️ Session expirée. Envoie une nouvelle photo.');
    return;
  }

  const { userId, chatId, imageBase64, preset } = content;
  const prompt = getPresetPrompt(preset);
  const startTime = Date.now();

  logUserAction(userId, 'processing_started', { contentId, preset });
  logProgress(userId, `Processing: preset=${preset}`, 'started');

  try {
    // Process through n8n CrowdMagic workflow
    const result = await processImage({
      imageBase64,
      prompt,
      userId: String(userId),
    });

    const processingTimeMs = Date.now() - startTime;

    if (!result.success) {
      throw new Error(result.error || 'Processing failed');
    }

    // Update stored content with result
    pendingContent.set(contentId, {
      ...content,
      resultUrl: result.imageUrl,
      processingTimeMs,
      status: SESSION_STATES.COMPLETED,
    });

    // Delete processing message
    try {
      await ctx.deleteMessage();
    } catch (e) {
      // Ignore deletion errors
    }

    // Send result image
    await ctx.replyWithPhoto(
      { url: result.imageUrl },
      {
        caption: `✨ *Voilà!* Ton restaurant avec des clients!\n\n` +
          `⏱ Généré en ${Math.round(processingTimeMs / 1000)}s\n\n` +
          `📥 Clique sur l'image pour la télécharger\n` +
          `📸 Envoie une autre photo pour continuer`,
        parse_mode: 'Markdown',
        reply_markup: mainMenuKeyboard().reply_markup,
      }
    );

    logProgress(userId, 'CrowdMagic processing', 'completed');
    logger.info('CrowdMagic completed successfully', {
      userId,
      contentId,
      preset,
      processingTimeMs,
    });
  } catch (error) {
    logProgress(userId, 'CrowdMagic processing', 'failed');
    logger.error('CrowdMagic processing failed', {
      userId,
      contentId,
      preset,
      error: error.message,
    });

    try {
      await ctx.deleteMessage();
    } catch (e) {
      // Ignore deletion errors
    }

    await ctx.reply(
      `😔 Erreur lors de la génération.\n\n` +
      `${error.message}\n\n` +
      `Essaie avec une autre photo ou réessaie plus tard.`,
      mainMenuKeyboard()
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
    // Convert document to photo format and process
    ctx.message.photo = [{
      file_id: document.file_id,
      width: 0,
      height: 0,
    }];

    return handlePhoto(ctx);
  }

  await ctx.reply(
    '⚠️ Envoie-moi une photo de ton restaurant!\n' +
    'Formats acceptés: JPG, PNG'
  );
}

module.exports = {
  handlePhoto,
  handleDocument,
  handlePresetSelection,
  getPendingContent,
  deletePendingContent,
};

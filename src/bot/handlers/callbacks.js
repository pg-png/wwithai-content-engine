/**
 * Callback Query Handler
 * Handles inline keyboard button presses
 */

const {
  getPendingContent,
  updatePendingContent,
  deletePendingContent,
  handleDecorChoice,
  handleThemeSelection,
  handleAngleSelection,
} = require('./photo');
const { updateContentEntry } = require('../../services/notion');
const {
  styleKeyboard,
  feedbackKeyboard,
  demoKeyboard,
} = require('../keyboards/approval');
const { logger, logUserAction } = require('../../utils/logger');

// Demo content for /demo command
const DEMO_CONTENT = {
  padthai: {
    caption: 'Le pad thai qui fait rêver 🍜 Nouilles sautées au wok, crevettes fraîches, et notre sauce maison qui fait toute la différence.',
    hashtags: ['#padthai', '#cuisineasiatique', '#foodiemontreal', '#restosmtl', '#wwithai'],
    imageUrl: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800', // Pad Thai
  },
  sushi: {
    caption: 'L\'art du sushi, version Montréal. Poisson ultra-frais livré ce matin, préparé avec passion ❤️',
    hashtags: ['#sushi', '#japanese', '#foodporn', '#mtlfood', '#wwithai'],
    imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800', // Sushi
  },
  dessert: {
    caption: 'Pour ceux qui gardent toujours une place pour le dessert 🍰 Notre création du chef, disponible ce weekend seulement.',
    hashtags: ['#dessert', '#patisserie', '#sweettooth', '#mtleats', '#wwithai'],
    imageUrl: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800', // Dessert
  },
};

/**
 * Main callback handler - routes to specific handlers
 */
async function handleCallback(ctx) {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from.id;

  logger.debug('Callback received', { userId, data });

  // Parse callback data
  const [action, ...params] = data.split(':');

  try {
    switch (action) {
      case 'decor':
        await handleDecorChoice(ctx, params[0], params[1]);
        break;
      case 'theme':
        await handleThemeSelection(ctx, params[0], params[1]);
        break;
      case 'angle':
        await handleAngleSelection(ctx, params[0], params[1]);
        break;
      case 'approve':
        await handleApprove(ctx, params[0]);
        break;
      case 'modify':
        await handleModify(ctx, params[0]);
        break;
      case 'reject':
        await handleReject(ctx, params[0]);
        break;
      case 'style':
        await handleStyleChange(ctx, params[0], params[1]);
        break;
      case 'feedback':
        await handleFeedback(ctx, params[0], params[1]);
        break;
      case 'demo':
        await handleDemo(ctx, params[0]);
        break;
      case 'platform':
        await handlePlatformSelect(ctx, params[0], params[1]);
        break;
      default:
        logger.warn('Unknown callback action', { action, data });
        await ctx.answerCbQuery('Action non reconnue');
    }
  } catch (error) {
    logger.error('Callback handler error', { error: error.message, action, userId });
    await ctx.answerCbQuery('Une erreur est survenue');
  }
}

/**
 * Handle approve action
 */
async function handleApprove(ctx, contentId) {
  const userId = ctx.from.id;
  const content = getPendingContent(contentId);

  logUserAction(userId, 'approve', { contentId });

  if (!content) {
    await ctx.answerCbQuery('⚠️ Contenu expiré');
    return;
  }

  // Update status
  updatePendingContent(contentId, { status: 'approved' });

  // Update Notion if configured
  updateContentEntry(contentId, { status: 'approved' })
    .catch(err => logger.warn('Notion update failed', { error: err.message }));

  // Format the final content for copying
  const hashtagString = Array.isArray(content.hashtags)
    ? content.hashtags.join(' ')
    : (content.hashtags || '');
  const fullCaption = `${content.caption || ''}\n\n${hashtagString}`;

  await ctx.answerCbQuery('✅ Approuvé!');

  await ctx.editMessageCaption(
    `🎉 *Post approuvé!*\n\n` +
    `📋 Copie cette caption:\n\n` +
    `\`\`\`\n${fullCaption}\n\`\`\`\n\n` +
    `📤 Prêt à poster sur Instagram!`,
    { parse_mode: 'Markdown' }
  );

  // Clean up after a delay
  setTimeout(() => deletePendingContent(contentId), 300000); // 5 minutes
}

/**
 * Handle modify action
 */
async function handleModify(ctx, contentId) {
  const userId = ctx.from.id;
  const content = getPendingContent(contentId);

  logUserAction(userId, 'modify', { contentId });

  if (!content) {
    await ctx.answerCbQuery('⚠️ Contenu expiré');
    return;
  }

  await ctx.answerCbQuery('✏️ Choisis un style');

  await ctx.editMessageReplyMarkup(styleKeyboard(contentId).reply_markup);
}

/**
 * Handle reject action
 */
async function handleReject(ctx, contentId) {
  const userId = ctx.from.id;
  const content = getPendingContent(contentId);

  logUserAction(userId, 'reject', { contentId });

  if (!content) {
    await ctx.answerCbQuery('⚠️ Contenu expiré');
    return;
  }

  await ctx.answerCbQuery('❌ Refusé');

  // Ask for feedback
  await ctx.editMessageCaption(
    `😔 Pas de problème!\n\n` +
    `Dis-moi ce qui ne va pas pour que j'apprenne:`,
    {
      parse_mode: 'Markdown',
      reply_markup: feedbackKeyboard(contentId).reply_markup,
    }
  );
}

/**
 * Handle style change request
 */
async function handleStyleChange(ctx, contentId, style) {
  const userId = ctx.from.id;
  const content = getPendingContent(contentId);

  logUserAction(userId, 'style_change', { contentId, style });

  if (!content) {
    await ctx.answerCbQuery('⚠️ Contenu expiré');
    return;
  }

  await ctx.answerCbQuery('🎨 Modification en cours...');

  // Generate new caption based on style
  let newCaption = content.caption;

  switch (style) {
    case 'punchy':
      newCaption = makePunchy(content.caption);
      break;
    case 'chill':
      newCaption = makeChill(content.caption);
      break;
    case 'short':
      newCaption = makeShort(content.caption);
      break;
    case 'detailed':
      newCaption = makeDetailed(content.caption);
      break;
    case 'original':
      // Keep original
      break;
  }

  // Update stored content
  updatePendingContent(contentId, { caption: newCaption });

  // Show updated content
  const { approvalKeyboard } = require('../keyboards/approval');
  const hashtagStr = Array.isArray(content.hashtags)
    ? content.hashtags.join(' ')
    : (content.hashtags || '');

  await ctx.editMessageCaption(
    `✨ *Nouvelle version:*\n\n${newCaption}\n\n${hashtagStr}`,
    {
      parse_mode: 'Markdown',
      reply_markup: approvalKeyboard(contentId).reply_markup,
    }
  );
}

/**
 * Handle feedback submission
 */
async function handleFeedback(ctx, contentId, feedbackType) {
  const userId = ctx.from.id;

  logUserAction(userId, 'feedback', { contentId, feedbackType });

  const feedbackMessages = {
    photo_bad: 'La photo n\'était pas bien améliorée',
    caption_bad: 'La caption ne correspondait pas',
    style_wrong: 'Le style ne matchait pas le resto',
    other: 'Autre raison',
  };

  // Log feedback
  updateContentEntry(contentId, {
    status: 'rejected',
    feedback: feedbackMessages[feedbackType] || feedbackType,
  }).catch(err => logger.warn('Notion update failed', { error: err.message }));

  // Clean up content
  deletePendingContent(contentId);

  await ctx.answerCbQuery('Merci pour ton feedback!');

  await ctx.editMessageCaption(
    `💡 *Merci pour ton feedback!*\n\n` +
    `Ça m'aide à m'améliorer.\n\n` +
    `📸 Envoie une nouvelle photo quand tu veux!`,
    { parse_mode: 'Markdown' }
  );
}

/**
 * Handle demo selection
 */
async function handleDemo(ctx, demoType) {
  const userId = ctx.from.id;

  logUserAction(userId, 'demo', { demoType });

  if (demoType === 'real') {
    await ctx.answerCbQuery('📸 Envoie ta photo!');
    await ctx.reply(
      '📸 *Mode réel activé!*\n\n' +
      'Envoie-moi une photo de ton plat et je génère ton post.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const demo = DEMO_CONTENT[demoType];

  if (!demo) {
    await ctx.answerCbQuery('Demo non trouvée');
    return;
  }

  await ctx.answerCbQuery('✨ Génération demo...');

  const { approvalKeyboard } = require('../keyboards/approval');
  const contentId = `demo-${demoType}`;

  await ctx.replyWithPhoto(
    { url: demo.imageUrl },
    {
      caption: `✨ *Exemple de post généré:*\n\n${demo.caption}\n\n${demo.hashtags.join(' ')}\n\n_Ceci est un exemple. Envoie ta propre photo!_`,
      parse_mode: 'Markdown',
      reply_markup: demoKeyboard().reply_markup,
    }
  );
}

/**
 * Handle platform selection
 */
async function handlePlatformSelect(ctx, contentId, platform) {
  const userId = ctx.from.id;

  logUserAction(userId, 'platform_select', { contentId, platform });

  const platforms = platform === 'all'
    ? ['instagram', 'tiktok', 'facebook']
    : [platform];

  updatePendingContent(contentId, { platforms });

  await ctx.answerCbQuery(`📱 ${platforms.join(', ')} sélectionné`);
}

// Caption transformation helpers
function makePunchy(caption) {
  return caption
    .replace(/\./g, '!')
    .replace(/,/g, ' 🔥')
    .toUpperCase()
    .substring(0, 150) + '...';
}

function makeChill(caption) {
  return caption
    .toLowerCase()
    .replace(/!/g, '.')
    .replace(/🔥/g, '✨');
}

function makeShort(caption) {
  const sentences = caption.split(/[.!?]/);
  return sentences[0] + '.';
}

function makeDetailed(caption) {
  return caption + '\n\n📍 Réservations ouvertes. Lien en bio.';
}

module.exports = {
  handleCallback,
  handleDemo,
  DEMO_CONTENT,
};

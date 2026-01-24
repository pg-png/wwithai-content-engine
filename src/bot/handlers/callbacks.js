/**
 * Callback Query Handler
 * Handles inline keyboard button presses for CrowdMagic
 */

const {
  getPendingContent,
  deletePendingContent,
  handlePresetSelection,
} = require('./photo');
const { demoKeyboard } = require('../keyboards/approval');
const { logger, logUserAction } = require('../../utils/logger');

// Demo content for /demo command
const DEMO_CONTENT = {
  restaurant: {
    caption: 'Un vendredi soir typique chez nous! Merci à tous nos clients fidèles.',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
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
      case 'preset':
        // CrowdMagic preset selection (elegant, lunch, romantic, celebration)
        await handlePresetSelection(ctx, params[0], params[1]);
        break;
      case 'demo':
        await handleDemo(ctx, params[0]);
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
 * Handle demo selection
 */
async function handleDemo(ctx, demoType) {
  const userId = ctx.from.id;

  logUserAction(userId, 'demo', { demoType });

  if (demoType === 'real') {
    await ctx.answerCbQuery('📸 Envoie ta photo!');
    await ctx.reply(
      '📸 *Envoie-moi une photo de ton restaurant VIDE*\n\n' +
      'Je vais y ajouter des clients avec l\'IA!',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  await ctx.answerCbQuery('📸 Envoie une photo pour essayer');
  await ctx.reply(
    '📸 *Envoie-moi une photo de ton restaurant*\n\n' +
    'Je vais y ajouter des clients élégants, un lunch animé, ou une soirée romantique!',
    { parse_mode: 'Markdown' }
  );
}

module.exports = {
  handleCallback,
  handleDemo,
  DEMO_CONTENT,
};

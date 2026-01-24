/**
 * Start Command Handler
 * Handles /start and onboarding flow
 */

const { mainMenuKeyboard } = require('../keyboards/approval');
const { logger, logUserAction } = require('../../utils/logger');

// Welcome message in Quebec French
const WELCOME_MESSAGE = `
👋 *Bienvenue sur Kai, ton assistant content!* (v2.0)

Je transforme tes photos de plats en posts Instagram professionnels.

📸 *Comment ça marche?*
1. Envoie-moi une photo de ton plat
2. Ajoute des photos de ton décor _(optionnel)_
3. Choisis l'ambiance et l'angle
4. Tu approuves → Prêt à poster!

✨ *C'est vraiment simple.*

Envoie-moi ta première photo pour voir la magie! 🪄
`;

const HELP_MESSAGE = `
❓ *Aide - Kai Content Bot*

*Commandes disponibles:*
/start - Redémarrer le bot
/demo - Voir des exemples
/help - Afficher cette aide

*Comment utiliser:*
📸 Envoie une photo → Je génère ton post
✅ Approuve → C'est prêt!
✏️ Modifie → Je retravaille
❌ Refuse → On recommence

*Tips pour de meilleurs résultats:*
• Bonne lumière naturelle
• Plat bien centré
• Arrière-plan épuré
• Photo nette (pas floue)

*Support:*
📧 support@wwithai.com
📱 @wwithai sur Instagram

Fait avec ❤️ par WWITHai
`;

/**
 * Handle /start command
 */
async function handleStart(ctx) {
  const userId = ctx.from.id;
  const firstName = ctx.from.first_name || 'Chef';

  logUserAction(userId, 'start', { firstName });
  logger.info(`New user started: ${firstName} (${userId})`);

  try {
    // Send welcome message with user's name
    const personalizedWelcome = WELCOME_MESSAGE.replace('Bienvenue', `Salut ${firstName}! Bienvenue`);

    await ctx.replyWithMarkdown(personalizedWelcome, mainMenuKeyboard());

    // Track new user (could send to analytics)
    logger.info('Welcome message sent', { userId, firstName });
  } catch (error) {
    logger.error('Error in start handler', { error: error.message, userId });
    await ctx.reply('Une erreur est survenue. Essaie /start à nouveau.');
  }
}

/**
 * Handle /help command
 */
async function handleHelp(ctx) {
  const userId = ctx.from.id;
  logUserAction(userId, 'help');

  try {
    await ctx.replyWithMarkdown(HELP_MESSAGE);
  } catch (error) {
    logger.error('Error in help handler', { error: error.message, userId });
    await ctx.reply('Erreur. Essaie à nouveau.');
  }
}

/**
 * Handle unknown commands
 */
async function handleUnknown(ctx) {
  const userId = ctx.from.id;
  const text = ctx.message?.text || '';

  // Ignore if it's a regular message (not a command)
  if (!text.startsWith('/')) return;

  logUserAction(userId, 'unknown_command', { command: text });

  await ctx.reply(
    `Je ne connais pas cette commande: ${text}\n\nEssaie /help pour voir les commandes disponibles.`
  );
}

module.exports = {
  handleStart,
  handleHelp,
  handleUnknown,
  WELCOME_MESSAGE,
  HELP_MESSAGE,
};

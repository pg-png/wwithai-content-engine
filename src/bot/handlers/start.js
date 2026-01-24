/**
 * Start Command Handler
 * CrowdMagic - Add AI people to restaurant photos
 */

const { mainMenuKeyboard } = require('../keyboards/approval');
const { logger, logUserAction } = require('../../utils/logger');

// Welcome message for CrowdMagic
const WELCOME_MESSAGE = `
👋 *Bienvenue sur CrowdMagic by WwithAI!*

Je remplis ton restaurant VIDE avec des clients générés par l'IA.

📸 *Comment ça marche?*
1. Envoie-moi une photo de ton resto VIDE
2. Choisis un style de clientèle:
   • Elegant Diners (soirée chic)
   • Busy Lunch (midi animé)
   • Romantic Evening (dîner romantique)
   • Group Celebration (fête/événement)
3. L'IA ajoute les clients (~90 sec)
4. Tu récupères l'image et tu postes!

✨ *Parfait pour le marketing quand tu n'as pas de vraies photos.*

Envoie ta première photo! 📷
`;

const HELP_MESSAGE = `
❓ *Aide - CrowdMagic Bot*

*Commandes:*
/start - Redémarrer le bot
/help - Afficher cette aide

*Comment utiliser:*
📸 Envoie une photo de ton resto VIDE
👥 Choisis le style de clients
⏳ Attends ~90 secondes
📥 Télécharge l'image

*Conseils pour de meilleurs résultats:*
• Photo de qualité (bonne lumière)
• Restaurant vide (pas de vraies personnes)
• Angle large (montre l'espace)
• Photo horizontale de préférence

*Styles disponibles:*
👔 Elegant Diners - Couples chics en soirée
☕ Busy Lunch - Professionnels à midi
💕 Romantic Evening - Ambiance date night
🎉 Group Celebration - Fête ou événement

*Support:*
📧 support@wwithai.com
📱 @AIrestohub sur Instagram

Fait avec ❤️ par WwithAI
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
    const personalizedWelcome = WELCOME_MESSAGE.replace('Bienvenue', `Salut ${firstName}! Bienvenue`);

    await ctx.replyWithMarkdown(personalizedWelcome, mainMenuKeyboard());

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

  if (!text.startsWith('/')) return;

  logUserAction(userId, 'unknown_command', { command: text });

  await ctx.reply(
    `Commande inconnue: ${text}\n\nEssaie /help pour voir les commandes.`
  );
}

module.exports = {
  handleStart,
  handleHelp,
  handleUnknown,
  WELCOME_MESSAGE,
  HELP_MESSAGE,
};

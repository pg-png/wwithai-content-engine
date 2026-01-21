/**
 * WWITHai Content Engine - Telegram Bot
 *
 * Transform restaurant photos into Instagram-ready posts in 60 seconds.
 *
 * @author Pascal Gonsales <pg@wwithai.com>
 * @version 1.0.0
 */

const { Telegraf } = require('telegraf');
const http = require('http');
const { config, validateConfig } = require('../utils/config');
const { logger } = require('../utils/logger');

// Import handlers
const { handleStart, handleHelp, handleUnknown } = require('./handlers/start');
const { handlePhoto, handleDocument } = require('./handlers/photo');
const { handleCallback, handleDemo, DEMO_CONTENT } = require('./handlers/callbacks');
const { demoKeyboard, mainMenuKeyboard } = require('./keyboards/approval');

// ASCII art banner
const BANNER = `
╔═══════════════════════════════════════════════════╗
║     🍽️  WWITHai Content Engine v1.0  🍽️          ║
║                                                   ║
║     Transform restaurant photos into             ║
║     Instagram-ready posts in 60 seconds          ║
╚═══════════════════════════════════════════════════╝
`;

/**
 * Initialize and start the bot
 */
async function startBot() {
  console.log(BANNER);

  // Validate configuration
  if (!validateConfig()) {
    logger.error('Configuration validation failed. Exiting.');
    process.exit(1);
  }

  // Create bot instance
  const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);

  // Error handling
  bot.catch((err, ctx) => {
    logger.error('Bot error', {
      error: err.message,
      stack: err.stack,
      updateType: ctx.updateType,
      userId: ctx.from?.id,
    });
  });

  // Middleware: Log all updates
  bot.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const responseTime = Date.now() - start;
    logger.debug(`Update processed in ${responseTime}ms`, {
      type: ctx.updateType,
      userId: ctx.from?.id,
    });
  });

  // ============================================
  // Command Handlers
  // ============================================

  bot.start(handleStart);
  bot.help(handleHelp);

  // Demo command
  bot.command('demo', async (ctx) => {
    logger.info('Demo command received', { userId: ctx.from.id });

    await ctx.replyWithMarkdown(
      `🎨 *Mode Demo*\n\n` +
      `Voici des exemples de posts que je peux générer.\n` +
      `Choisis un plat pour voir le résultat:`,
      demoKeyboard()
    );
  });

  // Status/health command (admin)
  bot.command('status', async (ctx) => {
    const { checkHealth } = require('../services/n8n');
    const { checkHealth: checkFalHealth } = require('../services/fal');

    const n8nOk = await checkHealth();
    const falOk = await checkFalHealth();

    await ctx.reply(
      `📊 *Status du système*\n\n` +
      `🤖 Bot: ✅ En ligne\n` +
      `⚡ n8n: ${n8nOk ? '✅' : '❌'}\n` +
      `🎨 fal.ai: ${falOk ? '✅' : '❌'}\n\n` +
      `Uptime: ${formatUptime(process.uptime())}`,
      { parse_mode: 'Markdown' }
    );
  });

  // ============================================
  // Message Handlers
  // ============================================

  // Handle photos
  bot.on('photo', handlePhoto);

  // Handle documents (for images sent as files)
  bot.on('document', handleDocument);

  // Handle keyboard buttons
  bot.hears('📸 Nouveau post', (ctx) => {
    ctx.reply('📸 Envoie-moi une photo de ton plat!');
  });

  bot.hears('🎨 Demo', async (ctx) => {
    await ctx.replyWithMarkdown(
      `🎨 *Mode Demo*\n\nChoisis un plat:`,
      demoKeyboard()
    );
  });

  bot.hears('⚙️ Settings', (ctx) => {
    ctx.reply(
      '⚙️ *Paramètres*\n\n' +
      'Les settings seront disponibles bientôt.\n' +
      'Pour l\'instant, envoie-moi tes photos!',
      { parse_mode: 'Markdown' }
    );
  });

  bot.hears('❓ Aide', handleHelp);

  // ============================================
  // Callback Query Handler
  // ============================================

  bot.on('callback_query', handleCallback);

  // ============================================
  // Catch-all for unknown messages
  // ============================================

  bot.on('text', async (ctx) => {
    const text = ctx.message.text;

    // Ignore keyboard button presses (handled above)
    if (['📸 Nouveau post', '🎨 Demo', '⚙️ Settings', '❓ Aide'].includes(text)) {
      return;
    }

    // If it's a command we don't know
    if (text.startsWith('/')) {
      return handleUnknown(ctx);
    }

    // Regular text message - prompt for photo
    await ctx.reply(
      '📸 Envoie-moi une photo de ton plat pour créer ton post!\n\n' +
      'Ou tape /demo pour voir des exemples.',
      mainMenuKeyboard()
    );
  });

  // ============================================
  // Start the bot
  // ============================================

  // Launch bot with retry logic for 409 conflicts
  logger.info('Starting bot...');

  const MAX_RETRIES = 5;
  const RETRY_DELAY = 10000; // 10 seconds

  let botInfo;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await bot.launch();
      botInfo = await bot.telegram.getMe();
      break; // Success!
    } catch (err) {
      if (err.message.includes('409') && attempt < MAX_RETRIES) {
        logger.warn(`Bot conflict (attempt ${attempt}/${MAX_RETRIES}), waiting ${RETRY_DELAY/1000}s...`);
        await new Promise(r => setTimeout(r, RETRY_DELAY));
      } else {
        throw err;
      }
    }
  }

  if (!botInfo) {
    logger.error('Failed to start bot after all retries');
    process.exit(1);
  }

  logger.info(`Bot started successfully!`, {
    username: botInfo.username,
    id: botInfo.id,
  });

  console.log(`\n✅ Bot is running: @${botInfo.username}\n`);
  console.log(`📱 Open Telegram and search for @${botInfo.username}`);
  console.log(`   or click: https://t.me/${botInfo.username}\n`);

  // Start HTTP server for Railway health checks
  const PORT = process.env.PORT || 3000;
  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        bot: botInfo.username,
        uptime: process.uptime()
      }));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(PORT, () => {
    console.log(`🌐 Health server running on port ${PORT}`);
  });

  // Graceful shutdown
  process.once('SIGINT', () => {
    logger.info('Received SIGINT, stopping bot...');
    bot.stop('SIGINT');
  });

  process.once('SIGTERM', () => {
    logger.info('Received SIGTERM, stopping bot...');
    bot.stop('SIGTERM');
  });
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

// Start the bot
startBot();

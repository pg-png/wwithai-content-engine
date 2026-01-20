/**
 * Configuration loader for WWITHai Content Engine
 * Loads environment variables from ~/.config/wwithai/.env
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Path to the centralized env file
const ENV_PATH = path.join(os.homedir(), '.config', 'wwithai', '.env');

/**
 * Load and parse environment variables from file
 */
function loadEnvFile() {
  try {
    if (!fs.existsSync(ENV_PATH)) {
      console.warn(`⚠️  Config file not found at ${ENV_PATH}`);
      console.warn('   Using process.env instead');
      return {};
    }

    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    const lines = content.split('\n');
    const env = {};

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }

    return env;
  } catch (error) {
    console.error('Error loading env file:', error.message);
    return {};
  }
}

// Load env file and merge with process.env
const fileEnv = loadEnvFile();

const config = {
  // Telegram
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || fileEnv.TELEGRAM_BOT_TOKEN,

  // AI Services
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || fileEnv.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || fileEnv.ANTHROPIC_API_KEY,
  FAL_API_KEY: process.env.FAL_API_KEY || fileEnv.FAL_API_KEY,

  // n8n
  N8N_API_KEY: process.env.N8N_API_KEY || fileEnv.N8N_API_KEY,
  N8N_URL: process.env.N8N_URL || fileEnv.N8N_URL || 'https://hanumet.app.n8n.cloud',
  N8N_WEBHOOK_PATH: '/webhook/content-engine',

  // Notion
  NOTION_API_KEY: process.env.NOTION_API_KEY || fileEnv.NOTION_API_KEY,
  NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID || fileEnv.NOTION_DATABASE_ID,

  // GitHub
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || fileEnv.GITHUB_TOKEN,

  // App Settings
  DEBUG: process.env.DEBUG === 'true',
  DEMO_MODE: process.env.DEMO_MODE === 'true',

  // Timeouts (in ms)
  PROCESSING_TIMEOUT: 120000, // 2 minutes for full pipeline
  WEBHOOK_TIMEOUT: 90000,    // 90 seconds for webhook response
};

/**
 * Validate required configuration
 * @returns {boolean} True if all required configs are present
 */
function validateConfig() {
  const required = ['TELEGRAM_BOT_TOKEN'];
  const missing = required.filter(key => !config[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required configuration:');
    missing.forEach(key => console.error(`   - ${key}`));
    return false;
  }

  return true;
}

/**
 * Get the full webhook URL
 */
function getWebhookUrl() {
  return `${config.N8N_URL}${config.N8N_WEBHOOK_PATH}`;
}

module.exports = {
  config,
  validateConfig,
  getWebhookUrl,
  ENV_PATH
};

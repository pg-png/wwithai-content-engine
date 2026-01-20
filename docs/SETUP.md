# Setup Guide

Complete setup guide for WWITHai Content Engine.

## 1. Create Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot`
3. Follow prompts to name your bot
4. Save the token you receive

## 2. Get API Keys

### OpenAI (for Vision analysis)
1. Go to [platform.openai.com](https://platform.openai.com)
2. Navigate to API Keys
3. Create new secret key

### Anthropic (for Claude captions)
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Navigate to API Keys
3. Create new key

### fal.ai (for image enhancement)
1. Go to [fal.ai](https://fal.ai)
2. Sign up/login
3. Get API key from dashboard

### Notion (optional, for logging)
1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create new integration
3. Copy the Internal Integration Token
4. Share a page with your integration

## 3. Configure n8n

### Option A: Use n8n Cloud
1. Sign up at [n8n.cloud](https://n8n.cloud)
2. Get API key from settings
3. Deploy workflow: `npm run deploy-workflow`

### Option B: Self-hosted n8n
1. Install n8n: `npm install -g n8n`
2. Start n8n: `n8n start`
3. Import workflow from `n8n-workflows/content-engine-v1.json`
4. Configure credentials in n8n UI

### Required n8n Credentials
- **OpenAI API** - For GPT-4 Vision
- **Anthropic API** - For Claude
- **HTTP Header Auth** - For fal.ai (Header: Authorization, Value: Key YOUR_FAL_KEY)

## 4. Set Up Environment

Create config directory:
```bash
mkdir -p ~/.config/wwithai
```

Create and edit `.env`:
```bash
cp .env.example ~/.config/wwithai/.env
nano ~/.config/wwithai/.env
```

## 5. Install & Run

```bash
# Install dependencies
npm install

# Deploy n8n workflow (optional - if using n8n API)
npm run deploy-workflow

# Set up Notion database (optional)
npm run setup-notion

# Start the bot
npm start
```

## 6. Test the Bot

1. Open Telegram
2. Search for your bot username
3. Send `/start`
4. Try `/demo` to see examples
5. Send a food photo to test

## Troubleshooting

### Bot doesn't respond
- Check `TELEGRAM_BOT_TOKEN` is correct
- Ensure bot is running (`npm start`)
- Check logs for errors

### Images not processing
- Verify n8n workflow is active
- Check n8n credentials are configured
- Test webhook URL manually

### Captions not generating
- Verify Anthropic API key is valid
- Check rate limits on your account

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more help.

# 🍽️ WWITHai Content Engine

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Telegram Bot](https://img.shields.io/badge/Telegram-Bot-blue.svg)](https://core.telegram.org/bots)
[![n8n](https://img.shields.io/badge/n8n-Workflow-orange.svg)](https://n8n.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Transform restaurant photos into Instagram-ready posts in 60 seconds.**

A Telegram bot that helps restaurateurs create professional social media content effortlessly. Send a photo of your dish, get back an enhanced image with a ready-to-post caption.

![Demo Flow](docs/demo-flow.gif)

## ✨ Features

- 📸 **Photo Enhancement** - AI-powered image upscaling and color correction
- ✍️ **Smart Captions** - Quebec French captions tailored for Instagram
- ⚡ **60-Second Turnaround** - From photo to post-ready content
- 🎨 **Style Customization** - Modify captions to match your brand voice
- 📊 **Activity Logging** - Track all content in Notion
- 🤖 **Demo Mode** - Try before you commit with sample photos

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- API keys for OpenAI, Anthropic, and fal.ai

### Installation

```bash
# Clone the repository
git clone https://github.com/pasgon/wwithai-content-engine.git
cd wwithai-content-engine

# Install dependencies
npm install

# Set up your environment
cp .env.example ~/.config/wwithai/.env
# Edit the .env file with your API keys

# Start the bot
npm start
```

### Configuration

Create or edit `~/.config/wwithai/.env`:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
FAL_API_KEY=your_fal_key
N8N_URL=https://your-n8n-instance.com
N8N_API_KEY=your_n8n_api_key
NOTION_API_KEY=your_notion_key
```

## 📱 Usage

### Telegram Commands

| Command | Description |
|---------|-------------|
| `/start` | Start the bot and see welcome message |
| `/demo` | See example content generation |
| `/help` | Get help and tips |
| `/status` | Check system health (admin) |

### Content Flow

1. **Send Photo** → User sends a photo of their dish
2. **Processing** → Bot analyzes, enhances, and generates caption
3. **Review** → User sees result with approval buttons
4. **Approve/Modify/Reject** → User takes action
5. **Done** → Caption ready to copy and post!

## 🔧 Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Telegram Bot   │────▶│   n8n Workflow  │────▶│  Notion Logs    │
│   (Telegraf)    │     │   (Webhook)     │     │  (Database)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ OpenAI   │ │ fal.ai   │ │ Claude   │
              │ Vision   │ │ Upscaler │ │ Caption  │
              └──────────┘ └──────────┘ └──────────┘
```

## 📁 Project Structure

```
wwithai-content-engine/
├── src/
│   ├── bot/
│   │   ├── index.js          # Main bot entry
│   │   ├── handlers/
│   │   │   ├── start.js      # /start, /help handlers
│   │   │   ├── photo.js      # Photo processing
│   │   │   └── callbacks.js  # Button callbacks
│   │   └── keyboards/
│   │       └── approval.js   # Inline keyboards
│   ├── services/
│   │   ├── n8n.js           # n8n webhook calls
│   │   ├── notion.js        # Notion logging
│   │   └── fal.js           # fal.ai enhancement
│   └── utils/
│       ├── config.js        # Configuration loader
│       └── logger.js        # Winston logger
├── n8n-workflows/
│   └── content-engine-v1.json
├── scripts/
│   ├── deploy-workflow.js   # Deploy to n8n
│   └── setup-notion.js      # Create Notion DB
├── docs/
│   ├── SETUP.md
│   ├── API_REFERENCE.md
│   └── TROUBLESHOOTING.md
└── package.json
```

## 🛠️ Development

### Deploy n8n Workflow

```bash
npm run deploy-workflow
```

### Setup Notion Database

```bash
npm run setup-notion
```

### Run in Development Mode

```bash
npm run dev
```

## 📸 Tips for Best Results

- **Lighting** - Natural light works best
- **Framing** - Center the dish, leave some margin
- **Background** - Keep it clean and simple
- **Focus** - Make sure the dish is sharp
- **Angle** - 45° or overhead shots work great

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT © [Pascal Gonsales](https://wwithai.com)

## 🙏 Credits

- [Telegraf](https://telegraf.js.org/) - Telegram Bot Framework
- [n8n](https://n8n.io/) - Workflow Automation
- [fal.ai](https://fal.ai/) - Image Enhancement
- [OpenAI](https://openai.com/) - Vision API
- [Anthropic](https://anthropic.com/) - Claude for Captions

---

Made with ❤️ by [WWITHai](https://instagram.com/AIrestohub)

*Transform your restaurant's social media presence, one dish at a time.*

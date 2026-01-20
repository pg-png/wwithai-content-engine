# SKILL: WWITHai Content Engine Bot
## Telegram Bot for Restaurant Photo Enhancement

---

## OVERVIEW

Build a Telegram bot that transforms restaurant phone photos into Instagram-ready content in 60 seconds using AI image enhancement and automated caption generation.

**Core Value:** Restaurant owner sends photo → Gets professional "magazine quality" image + caption → Approves → Ready to post.

---

## TECHNICAL STACK

| Component | Tool | Purpose |
|-----------|------|---------|
| Bot Interface | Telegram (Telegraf.js) | User interaction |
| Image Enhancement | Fal.ai Nano Banana Pro | Image-to-image transformation |
| Dish Analysis | OpenAI Vision (gpt-4o) | Detect dish, colors, style |
| Caption Generation | Claude API | Brand-aligned captions |
| Logging | Notion API | Track content history |
| Hosting | Railway | 24/7 bot operation |

---

## FAL.AI NANO BANANA PRO API

### Endpoint
```
POST https://queue.fal.run/fal-ai/nano-banana/edit
```

### Authentication
```
Authorization: Key ${FAL_KEY}
```

### Request Format
```javascript
{
  "prompt": "your detailed prompt here",
  "image_urls": ["https://url-to-uploaded-image.jpg"],
  "num_images": 1,
  "aspect_ratio": "1:1",  // or "4:5", "9:16", "16:9", "auto"
  "output_format": "png"
}
```

### Response Format
```javascript
{
  "images": [
    {
      "url": "https://fal.ai/output/generated-image.png",
      "content_type": "image/png",
      "file_name": "output.png"
    }
  ],
  "description": ""
}
```

### Node.js Implementation
```javascript
const fal = require('@fal-ai/client');

fal.config({
  credentials: process.env.FAL_KEY
});

async function enhanceImage(imageUrl, prompt) {
  const result = await fal.subscribe("fal-ai/nano-banana/edit", {
    input: {
      prompt: prompt,
      image_urls: [imageUrl],
      num_images: 1,
      aspect_ratio: "1:1",
      output_format: "png"
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        console.log("Processing...", update.logs);
      }
    }
  });
  
  return result.data.images[0].url;
}
```

### Async Queue Pattern (Recommended)
```javascript
// Submit job
const { request_id } = await fal.queue.submit("fal-ai/nano-banana/edit", {
  input: { prompt, image_urls: [imageUrl] },
  webhookUrl: "https://your-webhook.com/fal-callback"
});

// Check status
const status = await fal.queue.status("fal-ai/nano-banana/edit", {
  requestId: request_id,
  logs: true
});

// Get result when complete
const result = await fal.queue.result("fal-ai/nano-banana/edit", {
  requestId: request_id
});
```

---

## USER FLOW

### Step 1: Photo Received
```
User sends photo via Telegram
↓
Bot: "📸 Photo reçue! Choisis l'ambiance:"
     [🌅 Brunch] [☀️ Lunch] [🌙 Dinner]
     [🎉 Événement] [👑 Royal Thai]
```

### Step 2: Theme Selected
```
User taps theme button
↓
Bot: "⏳ Transformation en cours..."
↓
OpenAI Vision analyzes dish
↓
Generate theme-specific prompt
↓
Fal.ai Nano Banana processes image
↓
Claude generates caption
```

### Step 3: Result Delivered
```
Bot sends enhanced image + caption
↓
Bot: "Voici ta photo transformée! 🎨"
     [Caption text]
     
     [✅ Approuver] [✏️ Modifier] [❌ Refuser]
```

### Step 4: User Decision
```
✅ Approuver → Log to Notion, send download link
✏️ Modifier → "Qu'est-ce que tu veux changer?"
❌ Refuser → "Pas de problème. Envoie une autre photo!"
```

---

## THEMATIC PROMPT TEMPLATES

### Base Structure
```
Cinematic {shot_type} of {dish_description}.
{atmosphere_description}.
Setting: {environment_details}.
Style: {style_keywords}.
Lighting: {lighting_details}.
Keep the dish 100% authentic and unmodified.
```

### 🌅 BRUNCH
```
Cinematic close-up of {dish_description}.
Soft morning light streaming through windows, fresh and airy atmosphere.
Setting: White marble table, subtle greenery, minimalist ceramic dishes.
Style: Clean, bright, Instagram-worthy, lifestyle photography.
Lighting: Soft diffused natural daylight, gentle shadows, warm highlights.
Keep the dish 100% authentic and unmodified.
```

### ☀️ LUNCH
```
Cinematic close-up of {dish_description}.
Bright midday energy, casual elegance, inviting and fresh.
Setting: Natural wooden table, subtle restaurant ambiance, clean background.
Style: Modern bistro, appetizing, vibrant colors, editorial food photography.
Lighting: Bright natural daylight from side, crisp shadows, color-accurate.
Keep the dish 100% authentic and unmodified.
```

### 🌙 DINNER
```
Cinematic close-up of {dish_description}.
Intimate evening atmosphere, sophisticated and moody.
Setting: Dark wood table, candlelight reflections, elegant restaurant interior.
Style: Fine dining, dramatic, sensual, magazine-quality food photography.
Lighting: Warm golden candlelight, dramatic shadows, rich contrast, moody atmosphere.
Keep the dish 100% authentic and unmodified.
```

### 🎉 ÉVÉNEMENT
```
Cinematic close-up of {dish_description}.
Festive celebration atmosphere, joyful and vibrant energy.
Setting: Elegant table setting, subtle sparkles, celebration décor hints.
Style: Party vibes, luxurious, shareable moment, social media ready.
Lighting: Warm ambient with subtle sparkle effects, celebratory glow.
Keep the dish 100% authentic and unmodified.
```

### 👑 ROYAL THAI
```
Cinematic close-up of {dish_description}.
Royal Thai palace atmosphere, cultural elegance, once-in-a-lifetime dining experience.
Setting: Golden pedestal or traditional Thai serving ware, Thai mural background blur, rich cultural elements.
Style: Luxurious, museum-quality, heritage, exclusive, dramatic food photography.
Lighting: Warm golden hour light, dramatic shadows, soft particles in air, regal atmosphere.
Keep the dish 100% authentic and unmodified.
```

---

## DISH ANALYSIS (OpenAI Vision)

### System Prompt
```
You are a culinary expert analyzing food photos for a Thai restaurant.

Analyze this image and return JSON:
{
  "dish_name": "name of the dish if recognizable",
  "dish_description": "2-3 word description for prompt (e.g., 'purple Thai dumpling flower', 'green curry bowl', 'pad thai noodles')",
  "main_colors": ["color1", "color2"],
  "presentation_style": "plated/bowl/handheld/shared",
  "cuisine_type": "Thai/Asian/Fusion",
  "mood_suggestion": "which theme would work best"
}

Be concise. Focus on visual elements useful for image generation prompts.
```

### Implementation
```javascript
async function analyzeDish(imageUrl) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: ANALYSIS_PROMPT },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ],
    max_tokens: 300
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

---

## CAPTION GENERATION (Claude API)

### System Prompt
```
Tu es le gestionnaire de contenu pour un restaurant thaïlandais authentique au Québec.

Génère une caption Instagram pour cette photo de {dish_description}.

RÈGLES:
- Langue: Français québécois (naturel, pas formel)
- Ton: Authentique, appetissant, chaleureux
- Longueur: 2-3 phrases max
- CTA: Soft ("Viens goûter", "Réserve ta place", "On t'attend")
- Hashtags: 3-5 pertinents à la fin
- ÉVITER: Ton corporate, emojis excessifs, clichés, "délicieux", "meilleur"

CONTEXTE THÉMATIQUE: {theme}

Retourne SEULEMENT la caption, rien d'autre.
```

### Theme-Specific Additions
```javascript
const themeContext = {
  brunch: "Ambiance brunch du weekend, moment de détente",
  lunch: "Pause lunch énergisante, saveurs du midi",
  dinner: "Soirée intime, expérience gastronomique",
  event: "Célébration, moment spécial à partager",
  royal: "Expérience royale thaïlandaise, tradition et élégance"
};
```

### Implementation
```javascript
async function generateCaption(dishDescription, theme) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    system: CAPTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Plat: ${dishDescription}\nThème: ${themeContext[theme]}`
      }
    ]
  });
  
  return response.content[0].text;
}
```

---

## NOTION LOGGING

### Database Schema
| Property | Type | Description |
|----------|------|-------------|
| Date | Date | Creation timestamp |
| Restaurant | Select | Pamika Thai / Mae Sri / Garden Room |
| Original Photo | Files | Original upload |
| Enhanced Photo | Files | Fal.ai output |
| Caption | Rich Text | Generated caption |
| Theme | Select | brunch/lunch/dinner/event/royal |
| Status | Select | pending/approved/rejected/posted |
| Feedback | Rich Text | User modifications |
| Processing Time | Number | Seconds to process |
| Platform | Multi-select | Instagram/Facebook/TikTok |

### Implementation
```javascript
async function logToNotion(data) {
  await notion.pages.create({
    parent: { database_id: NOTION_DB_ID },
    properties: {
      "Date": { date: { start: new Date().toISOString() } },
      "Restaurant": { select: { name: data.restaurant } },
      "Caption": { rich_text: [{ text: { content: data.caption } }] },
      "Theme": { select: { name: data.theme } },
      "Status": { select: { name: "pending" } },
      "Processing Time": { number: data.processingTime }
    }
  });
}
```

---

## TELEGRAM BOT STRUCTURE

### Commands
```
/start - Welcome + instructions
/demo - Show 3 sample transformations
/help - Usage guide
/settings - Configure restaurant, preferences
```

### Callback Handlers
```javascript
// Theme selection
bot.action('theme_brunch', (ctx) => processWithTheme(ctx, 'brunch'));
bot.action('theme_lunch', (ctx) => processWithTheme(ctx, 'lunch'));
bot.action('theme_dinner', (ctx) => processWithTheme(ctx, 'dinner'));
bot.action('theme_event', (ctx) => processWithTheme(ctx, 'event'));
bot.action('theme_royal', (ctx) => processWithTheme(ctx, 'royal'));

// Approval
bot.action('approve', (ctx) => handleApproval(ctx));
bot.action('modify', (ctx) => handleModification(ctx));
bot.action('reject', (ctx) => handleRejection(ctx));
```

### Main Photo Handler
```javascript
bot.on('photo', async (ctx) => {
  const photo = ctx.message.photo.pop(); // Highest resolution
  const fileLink = await ctx.telegram.getFileLink(photo.file_id);
  
  // Store temporarily
  userSessions[ctx.from.id] = {
    originalPhoto: fileLink.href,
    timestamp: Date.now()
  };
  
  // Show theme selection
  await ctx.reply("📸 Photo reçue! Choisis l'ambiance:", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🌅 Brunch", callback_data: "theme_brunch" },
          { text: "☀️ Lunch", callback_data: "theme_lunch" },
          { text: "🌙 Dinner", callback_data: "theme_dinner" }
        ],
        [
          { text: "🎉 Événement", callback_data: "theme_event" },
          { text: "👑 Royal Thai", callback_data: "theme_royal" }
        ]
      ]
    }
  });
});
```

---

## ENVIRONMENT VARIABLES

```env
# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_token

# AI Services
FAL_KEY=your_fal_api_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Notion
NOTION_API_KEY=your_notion_key
NOTION_DATABASE_ID=your_database_id

# Optional
WEBHOOK_URL=https://your-domain.com/webhook
```

---

## FILE STRUCTURE

```
wwithai-content-engine/
├── src/
│   ├── index.js              # Bot entry point
│   ├── handlers/
│   │   ├── photo.js          # Photo upload handler
│   │   ├── themes.js         # Theme selection
│   │   └── approval.js       # Approval flow
│   ├── services/
│   │   ├── fal.js            # Fal.ai integration
│   │   ├── openai.js         # Vision analysis
│   │   ├── claude.js         # Caption generation
│   │   └── notion.js         # Logging
│   ├── prompts/
│   │   ├── themes.js         # Theme prompt templates
│   │   ├── analysis.js       # Vision prompts
│   │   └── captions.js       # Caption prompts
│   └── utils/
│       ├── sessions.js       # User session management
│       └── images.js         # Image upload/download
├── package.json
├── .env.example
└── README.md
```

---

## DEMO MODE

### /demo Command
Pre-loaded examples showing before/after for each theme:

```javascript
const demoImages = {
  brunch: {
    before: "https://storage.wwithai.com/demos/brunch-before.jpg",
    after: "https://storage.wwithai.com/demos/brunch-after.jpg",
    caption: "Le weekend commence ici. Nos œufs bénédictine façon thaï t'attendent. 🥢 #BrunchMontreal #ThaiFood #WeekendVibes"
  },
  dinner: {
    before: "https://storage.wwithai.com/demos/dinner-before.jpg",
    after: "https://storage.wwithai.com/demos/dinner-after.jpg",
    caption: "Quand le curry vert rencontre la chandelle. Une soirée qui se mérite. Réserve ta table. #DinnerDate #ThaiCuisine #Montreal"
  },
  royal: {
    before: "https://storage.wwithai.com/demos/royal-before.jpg",
    after: "https://storage.wwithai.com/demos/royal-after.jpg",
    caption: "Nos dumplings fleur, préparés comme à la cour royale de Bangkok. Une tradition dans ton assiette. #RoyalThai #Authentique"
  }
};
```

---

## ERROR HANDLING

```javascript
// Fal.ai timeout/error
if (falError) {
  await ctx.reply("⚠️ La transformation prend plus de temps que prévu. Réessaie dans quelques minutes.");
  logError('fal_timeout', falError);
}

// Image too small
if (photo.width < 512 || photo.height < 512) {
  await ctx.reply("📏 L'image est trop petite. Envoie une photo d'au moins 512x512 pixels.");
}

// Rate limiting
if (userRequests[userId] > 10) {
  await ctx.reply("⏳ Tu as atteint la limite. Réessaie dans 1 heure.");
}
```

---

## DEPLOYMENT (Railway)

### railway.json
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node src/index.js",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Procfile
```
worker: node src/index.js
```

---

## SUCCESS METRICS

| Metric | Target |
|--------|--------|
| Processing time | < 60 seconds |
| Approval rate | > 70% |
| Caption modification rate | < 30% |
| Daily usage | Track per restaurant |

---

## NEXT STEPS FOR CLAUDE CODE

1. Initialize Node.js project with dependencies
2. Set up Telegram bot with Telegraf
3. Implement photo handler with theme selection
4. Integrate Fal.ai Nano Banana for enhancement
5. Add OpenAI Vision for dish analysis
6. Add Claude for caption generation
7. Implement approval flow
8. Add Notion logging
9. Create demo mode
10. Deploy to Railway

**Start command:**
```bash
cd ~/wwithai-content-engine && npm init -y && npm install telegraf @fal-ai/client openai @anthropic-ai/sdk @notionhq/client dotenv
```

---

*Skill Document v1.0 — WWITHai Content Engine*
*Last Updated: January 2026*

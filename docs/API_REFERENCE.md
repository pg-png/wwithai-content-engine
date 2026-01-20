# API Reference

## n8n Webhook API

### POST /webhook/content-engine

Process an image and generate Instagram content.

**Request:**
```json
{
  "imageUrl": "https://example.com/food.jpg",
  "userId": "123456789",
  "chatId": "123456789",
  "restaurantName": "Chez Michel",
  "timestamp": "2024-01-20T12:00:00Z"
}
```

**Response (Success):**
```json
{
  "success": true,
  "originalUrl": "https://example.com/food.jpg",
  "enhancedUrl": "https://fal.media/enhanced/abc123.jpg",
  "caption": "Fresh sorti de la cuisine! Notre pad thai signature...",
  "hashtags": ["#padthai", "#foodiemontreal", "#restosmtl", "#cuisineasiatique", "#wwithai"],
  "analysis": {
    "dish_name": "Pad Thai",
    "cuisine_type": "Thai",
    "main_ingredients": ["rice noodles", "shrimp", "peanuts"],
    "presentation_style": "casual",
    "mood": "cozy"
  },
  "processingTimeMs": 45000,
  "userId": "123456789",
  "chatId": "123456789",
  "restaurantName": "Chez Michel"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "imageUrl is required"
}
```

## Internal Services

### n8n Service

```javascript
const { processImage } = require('./services/n8n');

const result = await processImage({
  imageUrl: 'https://...',
  userId: '123',
  chatId: '123',
  restaurantName: 'My Restaurant'
});
```

### Notion Service

```javascript
const { logContentEntry, updateContentEntry } = require('./services/notion');

// Log new entry
await logContentEntry({
  userId: '123',
  restaurantName: 'My Restaurant',
  status: 'pending',
  caption: 'Generated caption...',
  processingTimeMs: 45000
});

// Update entry
await updateContentEntry(pageId, {
  status: 'approved',
  feedback: 'User approved'
});
```

### fal.ai Service

```javascript
const { enhanceImage } = require('./services/fal');

const result = await enhanceImage({
  imageUrl: 'https://...',
  model: 'upscale', // or 'creative', 'realvis'
  scale: 2
});
```

## Telegram Callbacks

### Callback Data Format

```
action:contentId:param
```

**Actions:**
- `approve:abc123` - Approve content
- `modify:abc123` - Request modification
- `reject:abc123` - Reject content
- `style:abc123:punchy` - Change caption style
- `feedback:abc123:photo_bad` - Submit feedback
- `demo:padthai` - Show demo content
- `platform:abc123:instagram` - Select platform

## Error Codes

| Code | Description |
|------|-------------|
| `NETWORK_ERROR` | Network request failed |
| `TIMEOUT` | Request timed out |
| `INVALID_INPUT` | Missing or invalid parameters |
| `ENHANCEMENT_FAILED` | Image enhancement failed |
| `CAPTION_FAILED` | Caption generation failed |
| `NOTION_ERROR` | Notion API error |

## Rate Limits

| Service | Limit |
|---------|-------|
| OpenAI | 60 RPM (depends on tier) |
| Anthropic | 60 RPM (depends on tier) |
| fal.ai | Varies by plan |
| Telegram | 30 msg/sec per bot |

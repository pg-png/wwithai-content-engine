/**
 * Theme-based prompt templates for Fal.ai Nano Banana Pro
 * Each theme creates a different atmosphere for the dish photo
 */

const THEMES = {
  brunch: {
    emoji: '🌅',
    label: 'Brunch',
    captionContext: 'Ambiance brunch du weekend, moment de détente',
    promptTemplate: (dishDescription) => `Cinematic close-up of ${dishDescription}.
Soft morning light streaming through windows, fresh and airy atmosphere.
Setting: White marble table, subtle greenery, minimalist ceramic dishes.
Style: Clean, bright, Instagram-worthy, lifestyle photography.
Lighting: Soft diffused natural daylight, gentle shadows, warm highlights.
Keep the dish 100% authentic and unmodified.`
  },

  lunch: {
    emoji: '☀️',
    label: 'Lunch',
    captionContext: 'Pause lunch énergisante, saveurs du midi',
    promptTemplate: (dishDescription) => `Cinematic close-up of ${dishDescription}.
Bright midday energy, casual elegance, inviting and fresh.
Setting: Natural wooden table, subtle restaurant ambiance, clean background.
Style: Modern bistro, appetizing, vibrant colors, editorial food photography.
Lighting: Bright natural daylight from side, crisp shadows, color-accurate.
Keep the dish 100% authentic and unmodified.`
  },

  dinner: {
    emoji: '🌙',
    label: 'Dinner',
    captionContext: 'Soirée intime, expérience gastronomique',
    promptTemplate: (dishDescription) => `Cinematic close-up of ${dishDescription}.
Intimate evening atmosphere, sophisticated and moody.
Setting: Dark wood table, candlelight reflections, elegant restaurant interior.
Style: Fine dining, dramatic, sensual, magazine-quality food photography.
Lighting: Warm golden candlelight, dramatic shadows, rich contrast, moody atmosphere.
Keep the dish 100% authentic and unmodified.`
  },

  event: {
    emoji: '🎉',
    label: 'Événement',
    captionContext: 'Célébration, moment spécial à partager',
    promptTemplate: (dishDescription) => `Cinematic close-up of ${dishDescription}.
Festive celebration atmosphere, joyful and vibrant energy.
Setting: Elegant table setting, subtle sparkles, celebration décor hints.
Style: Party vibes, luxurious, shareable moment, social media ready.
Lighting: Warm ambient with subtle sparkle effects, celebratory glow.
Keep the dish 100% authentic and unmodified.`
  },

  royal: {
    emoji: '👑',
    label: 'Royal Thai',
    captionContext: 'Expérience royale thaïlandaise, tradition et élégance',
    promptTemplate: (dishDescription) => `Cinematic close-up of ${dishDescription}.
Royal Thai palace atmosphere, cultural elegance, once-in-a-lifetime dining experience.
Setting: Golden pedestal or traditional Thai serving ware, Thai mural background blur, rich cultural elements.
Style: Luxurious, museum-quality, heritage, exclusive, dramatic food photography.
Lighting: Warm golden hour light, dramatic shadows, soft particles in air, regal atmosphere.
Keep the dish 100% authentic and unmodified.`
  }
};

/**
 * Get theme configuration by key
 * @param {string} themeKey - Theme identifier
 * @returns {object} Theme configuration
 */
function getTheme(themeKey) {
  return THEMES[themeKey] || THEMES.dinner; // Default to dinner
}

/**
 * Generate image enhancement prompt for a theme and dish
 * @param {string} themeKey - Theme identifier
 * @param {string} dishDescription - Description of the dish from vision analysis
 * @returns {string} Complete prompt for Nano Banana Pro
 */
function generateEnhancementPrompt(themeKey, dishDescription) {
  const theme = getTheme(themeKey);
  return theme.promptTemplate(dishDescription);
}

/**
 * Get caption context for theme-aware caption generation
 * @param {string} themeKey - Theme identifier
 * @returns {string} Context string for caption generation
 */
function getCaptionContext(themeKey) {
  const theme = getTheme(themeKey);
  return theme.captionContext;
}

/**
 * Get all themes for keyboard display
 * @returns {Array} Array of theme objects with key, emoji, label
 */
function getAllThemes() {
  return Object.entries(THEMES).map(([key, theme]) => ({
    key,
    emoji: theme.emoji,
    label: theme.label
  }));
}

module.exports = {
  THEMES,
  getTheme,
  generateEnhancementPrompt,
  getCaptionContext,
  getAllThemes
};

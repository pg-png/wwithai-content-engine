/**
 * Theme-based prompt templates for Fal.ai Nano Banana Pro
 * UPDATED: More subtle, realistic food photography - no over-dramatic effects
 */

// Camera angle descriptions for food photography
const ANGLES = {
  '45deg': {
    label: '45° Classique',
    description: '45-degree angle shot, most appetizing angle for plated dishes and bowls'
  },
  'overhead': {
    label: 'Vue du haut',
    description: 'Overhead flat lay shot, perfect for spreads and table compositions'
  },
  'eyelevel': {
    label: 'Niveau des yeux',
    description: 'Eye-level hero shot, ideal for tall dishes, burgers, and layered items'
  },
  'threequarter': {
    label: '3/4 Angle',
    description: 'Three-quarter angle, versatile and natural-looking perspective'
  }
};

// Theme configurations - SUBTLE and REALISTIC
const THEMES = {
  brunch: {
    emoji: '🌅',
    label: 'Brunch',
    captionContext: 'Ambiance brunch du weekend, moment de détente',
    environment: 'Soft natural morning light, clean white or light wood table, minimal props. Fresh and bright atmosphere without being overexposed.'
  },

  lunch: {
    emoji: '☀️',
    label: 'Lunch',
    captionContext: 'Pause lunch énergisante, saveurs du midi',
    environment: 'Natural daylight, casual restaurant setting, wooden or marble surface. Clean and inviting, modern bistro feel.'
  },

  dinner: {
    emoji: '🌙',
    label: 'Dinner',
    captionContext: 'Soirée intime, expérience gastronomique',
    environment: 'Warm ambient restaurant lighting, dark wood table, soft background blur. Elegant but not theatrical. Subtle warmth, not dramatic candlelight.'
  },

  event: {
    emoji: '🎉',
    label: 'Événement',
    captionContext: 'Célébration, moment spécial à partager',
    environment: 'Warm festive lighting, elegant table setting with subtle celebration hints. Joyful but refined, not over-the-top party effects.'
  },

  royal: {
    emoji: '👑',
    label: 'Royal Thai',
    captionContext: 'Expérience royale thaïlandaise, tradition et élégance',
    environment: 'Rich warm tones, traditional Thai elements in background, golden accents. Cultural elegance without kitsch. Premium feel, museum-worthy presentation.'
  }
};

/**
 * Get theme configuration by key
 * @param {string} themeKey - Theme identifier
 * @returns {object} Theme configuration
 */
function getTheme(themeKey) {
  return THEMES[themeKey] || THEMES.dinner;
}

/**
 * Get angle configuration by key
 * @param {string} angleKey - Angle identifier
 * @returns {object} Angle configuration
 */
function getAngle(angleKey) {
  return ANGLES[angleKey] || ANGLES['45deg'];
}

/**
 * Generate image enhancement prompt
 * @param {string} themeKey - Theme identifier
 * @param {string} angleKey - Camera angle identifier
 * @param {string} dishDescription - Description of the dish from vision analysis
 * @param {boolean} hasDecorReference - Whether user provided decor photos
 * @returns {string} Complete prompt for Nano Banana Pro
 */
function generateEnhancementPrompt(themeKey, angleKey, dishDescription, hasDecorReference = false) {
  const theme = getTheme(themeKey);
  const angle = getAngle(angleKey);

  // Build the prompt with subtle, realistic approach
  let prompt = `Professional food photography of ${dishDescription}.
Camera angle: ${angle.description}.
Environment: ${theme.environment}`;

  // Add decor reference instruction if user provided photos
  if (hasDecorReference) {
    prompt += `
Style matching the provided restaurant interior reference photos.`;
  }

  prompt += `
Keep the dish completely unmodified and 100% authentic - no changes to the food itself.
Subtle, realistic enhancement only. No over-dramatic effects, no excessive shadows or highlights.
Style: Modern restaurant photography, Instagram-worthy, appetizing, natural-looking.`;

  return prompt;
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

/**
 * Get all angles for keyboard display
 * @returns {Array} Array of angle objects with key, label
 */
function getAllAngles() {
  return Object.entries(ANGLES).map(([key, angle]) => ({
    key,
    label: angle.label
  }));
}

module.exports = {
  THEMES,
  ANGLES,
  getTheme,
  getAngle,
  generateEnhancementPrompt,
  getCaptionContext,
  getAllThemes,
  getAllAngles
};

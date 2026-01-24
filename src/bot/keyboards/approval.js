/**
 * Telegram Keyboard Layouts
 * Inline keyboards for user interactions
 */

const { Markup } = require('telegraf');

/**
 * Decor upload prompt keyboard - shown after food photo
 * @param {string} contentId - Unique ID for the photo session
 */
function decorPromptKeyboard(contentId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📷 Oui, ajouter décor', `decor:${contentId}:yes`),
    ],
    [
      Markup.button.callback('⏭️ Non, continuer', `decor:${contentId}:skip`),
    ],
  ]);
}

/**
 * Done adding decor photos keyboard
 * @param {string} contentId - Unique ID for the photo session
 */
function decorDoneKeyboard(contentId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Terminé, continuer', `decor:${contentId}:done`),
    ],
  ]);
}

/**
 * Theme selection keyboard (legacy - not used in CrowdMagic)
 * @deprecated Use crowdMagicPresetsKeyboard instead
 */
function themeKeyboard(contentId) {
  return Markup.inlineKeyboard([]);
}

/**
 * Camera angle selection keyboard
 * @param {string} contentId - Unique ID for the photo session
 */
function angleKeyboard(contentId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📐 45° Classique', `angle:${contentId}:45deg`),
      Markup.button.callback('🔝 Vue du haut', `angle:${contentId}:overhead`),
    ],
    [
      Markup.button.callback('👁️ Niveau des yeux', `angle:${contentId}:eyelevel`),
      Markup.button.callback('🎯 3/4 Angle', `angle:${contentId}:threequarter`),
    ],
  ]);
}

/**
 * Approval keyboard shown after content generation
 * @param {string} contentId - Unique ID for the content
 */
function approvalKeyboard(contentId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Approuver', `approve:${contentId}`),
      Markup.button.callback('✏️ Modifier', `modify:${contentId}`),
    ],
    [
      Markup.button.callback('❌ Refuser', `reject:${contentId}`),
    ],
  ]);
}

/**
 * Platform selection keyboard
 * @param {string} contentId - Unique ID for the content
 */
function platformKeyboard(contentId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📸 Instagram', `platform:${contentId}:instagram`),
      Markup.button.callback('🎵 TikTok', `platform:${contentId}:tiktok`),
    ],
    [
      Markup.button.callback('📘 Facebook', `platform:${contentId}:facebook`),
      Markup.button.callback('📲 Toutes', `platform:${contentId}:all`),
    ],
  ]);
}

/**
 * Style selection keyboard for modifications
 * @param {string} contentId - Unique ID for the content
 */
function styleKeyboard(contentId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🔥 Plus punchy', `style:${contentId}:punchy`),
      Markup.button.callback('😌 Plus chill', `style:${contentId}:chill`),
    ],
    [
      Markup.button.callback('📝 Plus court', `style:${contentId}:short`),
      Markup.button.callback('📖 Plus détaillé', `style:${contentId}:detailed`),
    ],
    [
      Markup.button.callback('↩️ Garder original', `style:${contentId}:original`),
    ],
  ]);
}

/**
 * Feedback keyboard after rejection
 * @param {string} contentId - Unique ID for the content
 */
function feedbackKeyboard(contentId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📷 Photo pas bonne', `feedback:${contentId}:photo_bad`),
      Markup.button.callback('✍️ Texte pas bon', `feedback:${contentId}:caption_bad`),
    ],
    [
      Markup.button.callback('🎨 Style incorrect', `feedback:${contentId}:style_wrong`),
      Markup.button.callback('🤷 Autre raison', `feedback:${contentId}:other`),
    ],
  ]);
}

/**
 * Image feedback keyboard - shown after image generation
 * Allows user to approve the image or request a variation
 * @param {string} contentId - Unique ID for the content
 * @param {number} attempt - Current attempt number (for display)
 */
function imageFeedbackKeyboard(contentId, attempt = 1) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ C\'est bon!', `imgok:${contentId}`),
    ],
    [
      Markup.button.callback('🔄 Réessayer (variation)', `imgretry:${contentId}:variation`),
    ],
    [
      Markup.button.callback('🎨 Changer le style', `imgretry:${contentId}:style`),
      Markup.button.callback('📐 Changer l\'angle', `imgretry:${contentId}:angle`),
    ],
  ]);
}

/**
 * CrowdMagic presets keyboard - shown after receiving restaurant photo
 * These are the 4 presets from the web app
 * @param {string} contentId - Unique ID for the photo session
 */
function crowdMagicPresetsKeyboard(contentId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('👔 Elegant Diners', `preset:${contentId}:elegant`),
    ],
    [
      Markup.button.callback('☕ Busy Lunch', `preset:${contentId}:lunch`),
    ],
    [
      Markup.button.callback('💕 Romantic Evening', `preset:${contentId}:romantic`),
    ],
    [
      Markup.button.callback('🎉 Group Celebration', `preset:${contentId}:celebration`),
    ],
  ]);
}

/**
 * Get the full prompt for a CrowdMagic preset
 * @param {string} presetKey - The preset key
 * @returns {string} The full prompt
 */
function getPresetPrompt(presetKey) {
  const presets = {
    elegant: "Transform this restaurant photo by adding elegant, sophisticated diners enjoying their meal. Show couples and small groups in upscale attire, engaged in pleasant conversation. Warm ambient lighting, realistic photography style. The people should look natural and blend seamlessly with the existing environment.",
    lunch: "Add a vibrant lunch crowd to this restaurant space. Show business professionals and casual diners enjoying their meals. Natural daylight, lively atmosphere with realistic people in smart casual attire. Maintain the original ambiance while making it feel popular and welcoming.",
    romantic: "Transform this into a romantic evening scene with couples enjoying intimate dinners. Soft candlelight ambiance, elegant attire, wine glasses raised. Create a warm, luxurious atmosphere perfect for date night marketing.",
    celebration: "Add a festive group celebration to this space - a birthday party or special occasion with happy guests, some raising glasses in a toast. Mixed ages, joyful expressions, celebratory atmosphere while maintaining the restaurant's authentic style.",
  };
  return presets[presetKey] || presets.elegant;
}

/**
 * Demo mode keyboard
 */
function demoKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🍜 Pad Thai', 'demo:padthai'),
      Markup.button.callback('🍣 Sushi Roll', 'demo:sushi'),
    ],
    [
      Markup.button.callback('🍰 Dessert', 'demo:dessert'),
    ],
    [
      Markup.button.callback('📤 Essayer avec ma photo', 'demo:real'),
    ],
  ]);
}

/**
 * Confirmation keyboard for posting
 * @param {string} contentId - Unique ID for the content
 */
function confirmPostKeyboard(contentId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🚀 Confirmer & Poster', `confirm:${contentId}`),
      Markup.button.callback('↩️ Retour', `back:${contentId}`),
    ],
  ]);
}

/**
 * Main menu keyboard (persistent)
 */
function mainMenuKeyboard() {
  return Markup.keyboard([
    ['📸 Nouveau post', '🎨 Demo'],
    ['⚙️ Settings', '❓ Aide'],
  ]).resize();
}

/**
 * Remove keyboard
 */
function removeKeyboard() {
  return Markup.removeKeyboard();
}

module.exports = {
  decorPromptKeyboard,
  decorDoneKeyboard,
  themeKeyboard,
  angleKeyboard,
  approvalKeyboard,
  platformKeyboard,
  styleKeyboard,
  feedbackKeyboard,
  imageFeedbackKeyboard,
  crowdMagicPresetsKeyboard,
  getPresetPrompt,
  demoKeyboard,
  confirmPostKeyboard,
  mainMenuKeyboard,
  removeKeyboard,
};

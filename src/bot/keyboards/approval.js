/**
 * Telegram Keyboard Layouts
 * Inline keyboards for user interactions
 */

const { Markup } = require('telegraf');
const { getAllThemes } = require('../../prompts/themes');

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
 * Theme selection keyboard shown after decor step
 * @param {string} contentId - Unique ID for the photo session
 */
function themeKeyboard(contentId) {
  const themes = getAllThemes();

  // First row: Brunch, Lunch, Dinner
  const row1 = themes.slice(0, 3).map(t =>
    Markup.button.callback(`${t.emoji} ${t.label}`, `theme:${contentId}:${t.key}`)
  );

  // Second row: Event, Royal Thai
  const row2 = themes.slice(3).map(t =>
    Markup.button.callback(`${t.emoji} ${t.label}`, `theme:${contentId}:${t.key}`)
  );

  return Markup.inlineKeyboard([row1, row2]);
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
  demoKeyboard,
  confirmPostKeyboard,
  mainMenuKeyboard,
  removeKeyboard,
};

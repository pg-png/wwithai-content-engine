/**
 * Telegram Keyboard Layouts
 * Inline keyboards for user interactions
 */

const { Markup } = require('telegraf');

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
  approvalKeyboard,
  platformKeyboard,
  styleKeyboard,
  feedbackKeyboard,
  demoKeyboard,
  confirmPostKeyboard,
  mainMenuKeyboard,
  removeKeyboard,
};

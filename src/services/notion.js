/**
 * Notion Database Service
 * Logs content creation activities to Notion
 */

const axios = require('axios');
const { config } = require('../utils/config');
const { logger, logApiCall } = require('../utils/logger');

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

// Database ID (will be set after creation)
let databaseId = config.NOTION_DATABASE_ID;

/**
 * Create Notion API request headers
 */
function getHeaders() {
  return {
    'Authorization': `Bearer ${config.NOTION_API_KEY}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  };
}

/**
 * Log a content creation entry to Notion
 * @param {Object} entry - Log entry data
 */
async function logContentEntry(entry) {
  if (!config.NOTION_API_KEY || !databaseId) {
    logger.debug('Notion logging skipped (not configured)');
    return { success: false, reason: 'not_configured' };
  }

  const startTime = Date.now();

  try {
    const properties = {
      'Restaurant': {
        title: [{ text: { content: entry.restaurantName || 'Unknown' } }],
      },
      'Status': {
        select: { name: entry.status || 'pending' },
      },
      'User ID': {
        rich_text: [{ text: { content: String(entry.userId) } }],
      },
      'Processing Time': {
        number: entry.processingTimeMs || 0,
      },
      'Platform': {
        multi_select: (entry.platforms || ['instagram']).map(p => ({ name: p })),
      },
    };

    // Add optional fields
    if (entry.caption) {
      properties['Caption'] = {
        rich_text: [{ text: { content: entry.caption.substring(0, 2000) } }],
      };
    }

    if (entry.feedback) {
      properties['Feedback'] = {
        rich_text: [{ text: { content: entry.feedback.substring(0, 2000) } }],
      };
    }

    const response = await axios.post(
      `${NOTION_API_BASE}/pages`,
      {
        parent: { database_id: databaseId },
        properties,
      },
      {
        headers: getHeaders(),
        timeout: 10000,
      }
    );

    const durationMs = Date.now() - startTime;
    logApiCall('notion', 'create_page', durationMs, true);

    logger.info('Content entry logged to Notion', { pageId: response.data.id });

    return {
      success: true,
      pageId: response.data.id,
      url: response.data.url,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logApiCall('notion', 'create_page', durationMs, false);

    logger.error('Failed to log to Notion', {
      error: error.message,
      status: error.response?.status,
      details: error.response?.data,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update an existing content entry
 * @param {string} pageId - Notion page ID
 * @param {Object} updates - Fields to update
 */
async function updateContentEntry(pageId, updates) {
  if (!config.NOTION_API_KEY) {
    return { success: false, reason: 'not_configured' };
  }

  try {
    const properties = {};

    if (updates.status) {
      properties['Status'] = { select: { name: updates.status } };
    }

    if (updates.feedback) {
      properties['Feedback'] = {
        rich_text: [{ text: { content: updates.feedback.substring(0, 2000) } }],
      };
    }

    const response = await axios.patch(
      `${NOTION_API_BASE}/pages/${pageId}`,
      { properties },
      {
        headers: getHeaders(),
        timeout: 10000,
      }
    );

    logger.info('Content entry updated', { pageId });
    return { success: true, pageId: response.data.id };
  } catch (error) {
    logger.error('Failed to update Notion entry', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Create the content logs database
 * @param {string} parentPageId - Parent page ID to create database under
 */
async function createDatabase(parentPageId) {
  if (!config.NOTION_API_KEY) {
    throw new Error('NOTION_API_KEY not configured');
  }

  try {
    const response = await axios.post(
      `${NOTION_API_BASE}/databases`,
      {
        parent: { page_id: parentPageId },
        title: [{ text: { content: 'WWITHai Content Logs' } }],
        properties: {
          'Restaurant': { title: {} },
          'Date': { date: {} },
          'Status': {
            select: {
              options: [
                { name: 'pending', color: 'yellow' },
                { name: 'approved', color: 'green' },
                { name: 'rejected', color: 'red' },
                { name: 'posted', color: 'blue' },
              ],
            },
          },
          'User ID': { rich_text: {} },
          'Caption': { rich_text: {} },
          'Processing Time': { number: { format: 'number' } },
          'Feedback': { rich_text: {} },
          'Platform': {
            multi_select: {
              options: [
                { name: 'instagram', color: 'pink' },
                { name: 'tiktok', color: 'purple' },
                { name: 'facebook', color: 'blue' },
              ],
            },
          },
        },
      },
      {
        headers: getHeaders(),
        timeout: 15000,
      }
    );

    databaseId = response.data.id;
    logger.info('Notion database created', { databaseId });

    return {
      success: true,
      databaseId: response.data.id,
      url: response.data.url,
    };
  } catch (error) {
    logger.error('Failed to create Notion database', {
      error: error.message,
      details: error.response?.data,
    });
    throw error;
  }
}

/**
 * Set the database ID manually
 * @param {string} id - Database ID
 */
function setDatabaseId(id) {
  databaseId = id;
  logger.info('Notion database ID set', { databaseId: id });
}

module.exports = {
  logContentEntry,
  updateContentEntry,
  createDatabase,
  setDatabaseId,
};

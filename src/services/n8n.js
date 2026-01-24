/**
 * n8n Webhook Service
 * Handles communication with the n8n content processing workflow
 */

const axios = require('axios');
const { config, getWebhookUrl } = require('../utils/config');
const { logger, logApiCall } = require('../utils/logger');

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Sleep helper for retry logic
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Process an image through the n8n CrowdMagic workflow
 * @param {Object} params - Processing parameters
 * @param {string} params.imageBase64 - Base64 encoded image (without data:image prefix)
 * @param {string} params.prompt - The prompt describing what to add
 * @param {string} params.userId - Telegram user ID
 * @returns {Promise<Object>} Processing result with imageUrl
 */
async function processImage({
  imageBase64,
  prompt,
  userId,
}) {
  const webhookUrl = getWebhookUrl();
  const startTime = Date.now();

  logger.info(`Processing CrowdMagic for user ${userId}`, {
    webhookUrl,
    promptLength: prompt.length,
    imageSize: Math.round(imageBase64.length / 1024) + 'KB'
  });

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.post(
        webhookUrl,
        {
          image: imageBase64,  // CrowdMagic expects 'image' field
          prompt: prompt,
          style: 'realistic',
        },
        {
          timeout: config.WEBHOOK_TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'WWITHai-CrowdMagic-Bot/1.0',
          },
        }
      );

      const durationMs = Date.now() - startTime;
      logApiCall('n8n', 'crowdmagic', durationMs, true);

      logger.info('CrowdMagic response received', {
        status: response.status,
        durationMs,
        success: response.data?.success,
        hasImageUrl: !!response.data?.imageUrl,
      });

      // CrowdMagic returns: { success: true, imageUrl: "...", status: "success" }
      if (response.data?.success && response.data?.imageUrl) {
        return {
          success: true,
          imageUrl: response.data.imageUrl,
          durationMs,
        };
      } else {
        // Still processing or failed
        return {
          success: false,
          error: response.data?.debug?.failMsg || response.data?.status || 'Processing failed',
          status: response.data?.status,
          durationMs,
        };
      }
    } catch (error) {
      lastError = error;
      const durationMs = Date.now() - startTime;

      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        logger.warn(`Attempt ${attempt}/${MAX_RETRIES}: Request timeout`, { durationMs });
      } else if (error.response) {
        logger.warn(`Attempt ${attempt}/${MAX_RETRIES}: Server error ${error.response.status}`, {
          status: error.response.status,
          data: error.response.data,
        });
      } else {
        logger.warn(`Attempt ${attempt}/${MAX_RETRIES}: Network error`, {
          message: error.message,
        });
      }

      // Don't retry on client errors (4xx)
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        break;
      }

      // Wait before retry with exponential backoff
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        logger.info(`Waiting ${delay}ms before retry...`);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  logApiCall('n8n', 'crowdmagic', Date.now() - startTime, false);

  return {
    success: false,
    error: lastError?.message || 'Unknown error',
    errorCode: lastError?.response?.status || 'NETWORK_ERROR',
  };
}

/**
 * Check n8n workflow health
 * @returns {Promise<boolean>}
 */
async function checkHealth() {
  try {
    const response = await axios.get(`${config.N8N_URL}/healthz`, {
      timeout: 5000,
    });
    return response.status === 200;
  } catch (error) {
    logger.warn('n8n health check failed', { error: error.message });
    return false;
  }
}

/**
 * Get workflow status (requires n8n API key)
 * @param {string} workflowId
 * @returns {Promise<Object>}
 */
async function getWorkflowStatus(workflowId) {
  if (!config.N8N_API_KEY) {
    return { error: 'N8N_API_KEY not configured' };
  }

  try {
    const response = await axios.get(
      `${config.N8N_URL}/api/v1/workflows/${workflowId}`,
      {
        headers: {
          'X-N8N-API-KEY': config.N8N_API_KEY,
        },
        timeout: 10000,
      }
    );

    return {
      id: response.data.id,
      name: response.data.name,
      active: response.data.active,
    };
  } catch (error) {
    logger.error('Failed to get workflow status', { error: error.message });
    return { error: error.message };
  }
}

module.exports = {
  processImage,
  checkHealth,
  getWorkflowStatus,
};

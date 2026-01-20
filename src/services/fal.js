/**
 * fal.ai Image Enhancement Service
 * Handles image upscaling and enhancement using fal.ai APIs
 */

const axios = require('axios');
const { config } = require('../utils/config');
const { logger, logApiCall } = require('../utils/logger');

const FAL_API_BASE = 'https://fal.run';
const FAL_QUEUE_BASE = 'https://queue.fal.run';

// Models for different enhancement types
const MODELS = {
  upscale: 'fal-ai/clarity-upscaler',
  creative: 'fal-ai/creative-upscaler',
  realvis: 'fal-ai/aura-sr', // Fast lightweight upscaler
};

/**
 * Get fal.ai request headers
 */
function getHeaders() {
  return {
    'Authorization': `Key ${config.FAL_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Enhance an image using fal.ai
 * @param {Object} params - Enhancement parameters
 * @param {string} params.imageUrl - URL of the image to enhance
 * @param {string} [params.model] - Model to use (upscale, creative, realvis)
 * @param {number} [params.scale] - Upscale factor (default: 2)
 * @returns {Promise<Object>} Enhanced image result
 */
async function enhanceImage({ imageUrl, model = 'upscale', scale = 2 }) {
  if (!config.FAL_API_KEY) {
    logger.warn('FAL_API_KEY not configured, returning original image');
    return {
      success: true,
      enhancedUrl: imageUrl,
      fallback: true,
    };
  }

  const modelPath = MODELS[model] || MODELS.upscale;
  const startTime = Date.now();

  logger.info(`Enhancing image with ${modelPath}`, { imageUrl: imageUrl.substring(0, 50) + '...' });

  try {
    // Submit job to queue
    const queueResponse = await axios.post(
      `${FAL_QUEUE_BASE}/${modelPath}`,
      {
        image_url: imageUrl,
        upscale_factor: scale,
        // Model-specific parameters
        ...(model === 'creative' ? {
          creativity: 0.3, // Keep it realistic
          resemblance: 0.8,
        } : {}),
      },
      {
        headers: getHeaders(),
        timeout: 30000,
      }
    );

    const requestId = queueResponse.data.request_id;
    logger.info('Enhancement job submitted', { requestId });

    // Poll for completion
    const result = await pollForResult(modelPath, requestId);
    const durationMs = Date.now() - startTime;

    logApiCall('fal.ai', modelPath, durationMs, true);

    return {
      success: true,
      enhancedUrl: result.image?.url || result.images?.[0]?.url,
      originalUrl: imageUrl,
      model: modelPath,
      processingTimeMs: durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logApiCall('fal.ai', modelPath, durationMs, false);

    logger.error('Image enhancement failed', {
      error: error.message,
      status: error.response?.status,
    });

    // Graceful degradation: return original image
    return {
      success: true,
      enhancedUrl: imageUrl,
      fallback: true,
      error: error.message,
    };
  }
}

/**
 * Poll for job completion
 * @param {string} modelPath - Model path
 * @param {string} requestId - Request ID to poll
 * @param {number} maxWaitMs - Maximum wait time (default: 60s)
 */
async function pollForResult(modelPath, requestId, maxWaitMs = 60000) {
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await axios.get(
        `${FAL_QUEUE_BASE}/${modelPath}/requests/${requestId}/status`,
        { headers: getHeaders(), timeout: 10000 }
      );

      const status = response.data.status;

      if (status === 'COMPLETED') {
        // Fetch the result
        const resultResponse = await axios.get(
          `${FAL_QUEUE_BASE}/${modelPath}/requests/${requestId}`,
          { headers: getHeaders(), timeout: 10000 }
        );
        return resultResponse.data;
      }

      if (status === 'FAILED') {
        throw new Error(`Enhancement failed: ${response.data.error || 'Unknown error'}`);
      }

      // Still processing, wait and poll again
      logger.debug(`Enhancement status: ${status}`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Enhancement request not found');
      }
      throw error;
    }
  }

  throw new Error('Enhancement timeout');
}

/**
 * Quick health check for fal.ai
 */
async function checkHealth() {
  if (!config.FAL_API_KEY) {
    return false;
  }

  try {
    // Just check if we can authenticate
    const response = await axios.get(
      `${FAL_API_BASE}/fal-ai/aura-sr`,
      {
        headers: getHeaders(),
        timeout: 5000,
        validateStatus: () => true, // Don't throw on any status
      }
    );
    return response.status !== 401;
  } catch (error) {
    return false;
  }
}

module.exports = {
  enhanceImage,
  checkHealth,
  MODELS,
};

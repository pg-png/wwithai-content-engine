#!/usr/bin/env node
/**
 * Deploy n8n Workflow Script
 * Deploys the content-engine workflow to n8n via API
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load config
const os = require('os');
const envPath = path.join(os.homedir(), '.config', 'wwithai', '.env');

function loadEnv() {
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');
    const env = {};
    for (const line of lines) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
    return env;
  } catch (e) {
    console.error('Failed to load env file:', e.message);
    process.exit(1);
  }
}

const env = loadEnv();
const N8N_URL = env.N8N_URL || 'https://hanumet.app.n8n.cloud';
const N8N_API_KEY = env.N8N_API_KEY;

if (!N8N_API_KEY) {
  console.error('❌ N8N_API_KEY not found in env file');
  process.exit(1);
}

async function deployWorkflow() {
  console.log('🚀 Deploying WWITHai Content Engine workflow to n8n...\n');

  // Load workflow JSON
  const workflowPath = path.join(__dirname, '..', 'n8n-workflows', 'content-engine-v1.json');

  if (!fs.existsSync(workflowPath)) {
    console.error('❌ Workflow file not found:', workflowPath);
    process.exit(1);
  }

  const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));
  console.log(`📄 Loaded workflow: ${workflow.name}`);

  try {
    // Check if workflow already exists
    console.log('🔍 Checking for existing workflow...');

    const listResponse = await axios.get(
      `${N8N_URL}/api/v1/workflows`,
      {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
        },
      }
    );

    const existing = listResponse.data.data?.find(
      w => w.name === workflow.name
    );

    let workflowId;

    if (existing) {
      console.log(`📝 Updating existing workflow (ID: ${existing.id})...`);

      // Update existing workflow
      const updateResponse = await axios.put(
        `${N8N_URL}/api/v1/workflows/${existing.id}`,
        {
          ...workflow,
          id: existing.id,
        },
        {
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      workflowId = updateResponse.data.id;
      console.log('✅ Workflow updated successfully!');
    } else {
      console.log('📤 Creating new workflow...');

      // Create new workflow
      const createResponse = await axios.post(
        `${N8N_URL}/api/v1/workflows`,
        workflow,
        {
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      workflowId = createResponse.data.id;
      console.log('✅ Workflow created successfully!');
    }

    // Activate the workflow
    console.log('⚡ Activating workflow...');

    await axios.patch(
      `${N8N_URL}/api/v1/workflows/${workflowId}`,
      { active: true },
      {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('\n✨ Deployment complete!\n');
    console.log(`📍 Workflow ID: ${workflowId}`);
    console.log(`🔗 Webhook URL: ${N8N_URL}/webhook/content-engine`);
    console.log(`🖥️  Dashboard: ${N8N_URL}/workflow/${workflowId}`);

  } catch (error) {
    console.error('\n❌ Deployment failed:');
    console.error(error.response?.data || error.message);
    process.exit(1);
  }
}

deployWorkflow();

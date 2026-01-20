#!/usr/bin/env node
/**
 * Setup Notion Database Script
 * Creates the WWITHai Content Logs database in Notion
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const readline = require('readline');

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
const NOTION_API_KEY = env.NOTION_API_KEY;
const NOTION_API_BASE = 'https://api.notion.com/v1';

if (!NOTION_API_KEY) {
  console.error('❌ NOTION_API_KEY not found in env file');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createDatabase(parentPageId) {
  console.log('\n🗄️  Creating WWITHai Content Logs database...\n');

  const databaseSchema = {
    parent: { page_id: parentPageId },
    title: [
      {
        type: 'text',
        text: { content: 'WWITHai Content Logs' },
      },
    ],
    properties: {
      'Restaurant': {
        title: {},
      },
      'Date': {
        date: {},
      },
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
      'User ID': {
        rich_text: {},
      },
      'Caption': {
        rich_text: {},
      },
      'Processing Time (ms)': {
        number: {
          format: 'number',
        },
      },
      'Feedback': {
        rich_text: {},
      },
      'Platform': {
        multi_select: {
          options: [
            { name: 'instagram', color: 'pink' },
            { name: 'tiktok', color: 'purple' },
            { name: 'facebook', color: 'blue' },
          ],
        },
      },
      'Original Photo': {
        url: {},
      },
      'Enhanced Photo': {
        url: {},
      },
    },
  };

  try {
    const response = await axios.post(
      `${NOTION_API_BASE}/databases`,
      databaseSchema,
      {
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
      }
    );

    console.log('✅ Database created successfully!\n');
    console.log(`📍 Database ID: ${response.data.id}`);
    console.log(`🔗 URL: ${response.data.url}\n`);

    // Save database ID to env
    console.log('💾 Saving database ID to env file...');

    let envContent = fs.readFileSync(envPath, 'utf-8');
    if (envContent.includes('NOTION_DATABASE_ID')) {
      envContent = envContent.replace(
        /NOTION_DATABASE_ID=.*/,
        `NOTION_DATABASE_ID=${response.data.id}`
      );
    } else {
      envContent += `\nNOTION_DATABASE_ID=${response.data.id}`;
    }
    fs.writeFileSync(envPath, envContent);

    console.log('✅ Database ID saved to env file!\n');

    return response.data;
  } catch (error) {
    console.error('❌ Failed to create database:');
    console.error(error.response?.data || error.message);
    throw error;
  }
}

async function searchForPages() {
  console.log('🔍 Searching for pages you can use as parent...\n');

  try {
    const response = await axios.post(
      `${NOTION_API_BASE}/search`,
      {
        filter: { property: 'object', value: 'page' },
        page_size: 10,
      },
      {
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
      }
    );

    if (response.data.results.length === 0) {
      console.log('⚠️  No pages found. Make sure your Notion integration has access to at least one page.\n');
      return null;
    }

    console.log('Available pages:\n');
    response.data.results.forEach((page, index) => {
      const title = page.properties?.title?.title?.[0]?.plain_text ||
                    page.properties?.Name?.title?.[0]?.plain_text ||
                    'Untitled';
      console.log(`  ${index + 1}. ${title} (${page.id})`);
    });
    console.log('');

    return response.data.results;
  } catch (error) {
    console.error('❌ Failed to search pages:', error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('\n🚀 WWITHai Content Engine - Notion Setup\n');
  console.log('This script will create a database to log content creation activity.\n');

  // Search for available pages
  const pages = await searchForPages();

  let parentPageId;

  if (pages && pages.length > 0) {
    const selection = await question('Enter page number to use as parent (or paste a page ID): ');

    const pageNum = parseInt(selection);
    if (pageNum > 0 && pageNum <= pages.length) {
      parentPageId = pages[pageNum - 1].id;
    } else {
      parentPageId = selection.trim();
    }
  } else {
    parentPageId = await question('Enter the parent page ID: ');
  }

  if (!parentPageId) {
    console.error('❌ Parent page ID is required');
    process.exit(1);
  }

  // Remove any dashes if user pasted URL format
  parentPageId = parentPageId.replace(/-/g, '').replace(/.*\//, '').substring(0, 32);

  try {
    await createDatabase(parentPageId);
    console.log('✨ Notion setup complete!\n');
  } catch (error) {
    console.error('Setup failed.');
    process.exit(1);
  }

  rl.close();
}

main();

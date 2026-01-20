# Troubleshooting Guide

Common issues and solutions for WWITHai Content Engine.

## Bot Issues

### Bot doesn't respond to /start

**Symptoms:** Messages sent to bot get no response.

**Solutions:**
1. Check bot is running: `npm start`
2. Verify token: Ensure `TELEGRAM_BOT_TOKEN` is correct
3. Check logs for errors
4. Try restarting the bot

### "Configuration validation failed"

**Symptoms:** Bot exits immediately on start.

**Solutions:**
1. Ensure env file exists: `~/.config/wwithai/.env`
2. Check all required variables are set
3. Verify no trailing spaces in values

## Processing Issues

### "Processing failed" after sending photo

**Symptoms:** Photo uploads but returns error.

**Solutions:**
1. Check n8n workflow is active
2. Verify webhook URL: `https://your-n8n/webhook/content-engine`
3. Test webhook manually with curl:
```bash
curl -X POST https://your-n8n/webhook/content-engine \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://example.com/test.jpg"}'
```

### Images not enhancing

**Symptoms:** Original image returned instead of enhanced.

**Solutions:**
1. Check fal.ai API key is valid
2. Verify fal.ai account has credits
3. Image might be too large (>10MB limit)
4. Check fal.ai status: https://status.fal.ai

### Caption generation failing

**Symptoms:** Generic fallback caption instead of AI-generated.

**Solutions:**
1. Verify Anthropic API key
2. Check rate limits on your account
3. OpenAI Vision might have failed first - check that too

## n8n Issues

### Webhook returns 404

**Solutions:**
1. Verify workflow is active in n8n
2. Check webhook path matches: `/webhook/content-engine`
3. Ensure workflow has proper Respond to Webhook node

### Workflow times out

**Solutions:**
1. Increase Wait node duration
2. fal.ai might be slow - check their status
3. Consider reducing image size before processing

### Credentials error in n8n

**Solutions:**
1. Re-enter credentials in n8n UI
2. Test each credential individually
3. Check API key validity on each service

## Notion Issues

### "Notion logging skipped"

**Symptoms:** Warning in logs about Notion.

**Solutions:**
1. This is normal if Notion is not configured
2. Run `npm run setup-notion` to set up
3. Verify NOTION_API_KEY and NOTION_DATABASE_ID

### Database creation fails

**Solutions:**
1. Ensure integration has access to parent page
2. Share parent page with your integration
3. Check parent page ID format (no dashes)

## Performance Issues

### Processing takes >90 seconds

**Solutions:**
1. Image enhancement is slowest step
2. Try smaller images (under 2MB)
3. Check API service status pages
4. Consider using faster fal.ai model

### High memory usage

**Solutions:**
1. Restart bot periodically
2. Clear pending content map
3. Check for memory leaks in logs

## Debug Mode

Enable debug logging:
```bash
DEBUG=true npm start
```

This will show:
- All API calls and responses
- Processing step timings
- Detailed error information

## Getting Help

If none of these solutions work:

1. Check logs: Look for error messages
2. Test APIs individually: Verify each service works
3. Open an issue: https://github.com/pasgon/wwithai-content-engine/issues

Include in your issue:
- Error message from logs
- Steps to reproduce
- Environment (OS, Node version)

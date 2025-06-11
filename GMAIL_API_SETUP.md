# Gmail API Setup Guide

## Quick Setup for Existing Google Drive Users

Since you already have Google Drive integration working, you just need to enable the Gmail API in your existing Google Cloud Console project:

### 1. Enable Gmail API in Your Existing Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **Select the same project you used for Google Drive** (important!)
3. Go to "APIs & Services" → "Library"
4. Search for "Gmail API"
5. Click "Enable"

That's it! Your existing Google Drive credentials will now work for Gmail too.

### 2. Restart Banbury Application (if needed)

After enabling the Gmail API, restart the Banbury application for changes to take effect.

## Complete Setup for New Users

If you don't have Google Drive integration yet, follow these steps:

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable both APIs:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Drive API" and click "Enable"
   - Search for "Gmail API" and click "Enable"

### 2. Create Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Configure OAuth consent screen (if prompted)
4. Choose "Desktop application" as application type
5. Download the `credentials.json` file

### 3. Set Environment Variable

**Option A: Set in your shell (temporary)**
```bash
export GOOGLE_CREDENTIALS="$(cat /path/to/your/credentials.json)"
```

**Option B: Add to your shell profile (permanent)**
```bash
# Add to ~/.bashrc, ~/.zshrc, or ~/.profile
export GOOGLE_CREDENTIALS="$(cat /path/to/your/credentials.json)"
```

**Option C: Create .env file in project root**
```bash
# In banbury-frontend/.env
GOOGLE_CREDENTIALS={"web":{"client_id":"...your credentials content..."}}
```

### 4. Configure Integrations in Banbury

1. Set up Google Drive integration first (this stores your credentials)
2. Then enable Gmail integration (will use the same credentials)

## Current Status (Using Existing Google Drive Credentials)

With Google Drive already configured:
- ✅ Gmail integration detects your existing Google credentials
- ✅ Gmail tools are available in AI agent immediately
- ✅ No additional authentication needed
- ✅ Uses the same OAuth token as Google Drive

## With Gmail API Enabled

Once Gmail API is enabled in your Google Cloud project:
- ✅ Real Gmail search functionality
- ✅ Read actual emails and threads
- ✅ Send and create real emails
- ✅ Full Gmail API access through AI agent

## Troubleshooting

**Gmail tools not working after enabling API?**
- Make sure you enabled Gmail API in the SAME project as Google Drive
- Restart Banbury application
- Check that Google Drive integration is still working

**"Insufficient permissions" errors?**
- Your existing OAuth token might need additional scopes
- You may need to re-authenticate Google Drive to get Gmail permissions
- In Settings → Integrations, try disabling and re-enabling Google Drive

**Still seeing credential errors?**
- Verify Gmail API is enabled: Go to Cloud Console → APIs & Services → Enabled APIs
- Check that both "Google Drive API" and "Gmail API" are listed
- Restart your development server/application

## API Scopes

The integration requires these OAuth scopes (automatically handled):
- `https://www.googleapis.com/auth/drive` (for Google Drive)
- `https://www.googleapis.com/auth/gmail.modify` (for Gmail access)
- `https://www.googleapis.com/auth/userinfo.email` (for user identification)

If you previously authenticated with limited scopes, you may need to re-authenticate to get Gmail access.

## Next Steps

1. **Enable Gmail API** in your existing Google Cloud project
2. **Restart Banbury** application
3. **Configure Gmail** in Settings → Integrations
4. **Test Gmail tools** in the AI agent

Your existing Google Drive credentials should work seamlessly with Gmail! 
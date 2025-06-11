# Google Calendar Integration

This document summarizes the Google Calendar integration implementation for the Banbury frontend.

## Implementation Overview

The Google Calendar integration has been implemented following the exact same pattern as the Gmail integration.

## Files Created/Modified

### 1. **googleCalendarTools.ts** (New File)
Location: `packages/core/src/ai/agent/tools/googleCalendarTools.ts`

Created Google Calendar tools for the AI agent:
- `GoogleCalendarListEvents` - List calendar events with filters
- `GoogleCalendarGetEvent` - Get specific event details
- `GoogleCalendarCreateEvent` - Create new calendar events
- `GoogleCalendarUpdateEvent` - Update existing events
- `GoogleCalendarDeleteEvent` - Delete calendar events

### 2. **integrations.ts** (Modified)
Location: `packages/core/src/settings/integrations.ts`

Added Google Calendar integration functions:
- `getGoogleCalendarIntegrationStatus()` - Check integration status
- `enableGoogleCalendarIntegration()` - Enable the integration
- `disableGoogleCalendarIntegration()` - Disable the integration
- `isGoogleCalendarEnabled()` - Quick check for enabled status
- `checkGoogleCalendarApiAccess()` - Check API access through backend

### 3. **Integrations.tsx** (Modified)
Location: `packages/frontend/src/components/pages/Settings/Integrations.tsx`

Added Google Calendar UI components:
- Google Calendar integration card in available/installed integrations
- Status chip to show active/inactive status
- Enable/disable functionality with dialogs
- Information alerts about API requirements

### 4. **agent.ts** (Modified)
Location: `packages/core/src/ai/agent/agent.ts`

- Imported `createGoogleCalendarTools`
- Added `googleCalendarTools` property
- Updated `rebuildTools()` to include Google Calendar tools
- Added Google Calendar info to the system prompt

### 5. **AI.tsx** (Modified)
Location: `packages/frontend/src/components/pages/AI/AI.tsx`

- Added loading of Google Calendar integration status on component mount
- Google Calendar tools are now properly enabled/disabled based on integration status

## Usage

### For Users:
1. Navigate to Settings → Integrations
2. Configure Google Drive integration first (required for Google credentials)
3. Enable Google Calendar API in Google Cloud Console
4. Click "Configure" on Google Calendar integration
5. Once enabled, the AI agent can help with calendar management tasks

### For AI Agent:
When Google Calendar is enabled, the AI agent can:
- List upcoming events
- Create new calendar events
- Update existing events
- Delete events
- Search for specific events

## Backend Requirements

The following backend endpoints need to be implemented:
- `GET /files/google_calendar/check_access` - Check if user has Google Calendar API access
- `GET /files/google_calendar/events` - List calendar events
- `GET /files/google_calendar/event/{calendarId}/{eventId}` - Get specific event
- `POST /files/google_calendar/event` - Create new event
- `PUT /files/google_calendar/event` - Update existing event
- `DELETE /files/google_calendar/event/{calendarId}/{eventId}` - Delete event

## Notes

- Google Calendar uses the same OAuth credentials as Google Drive
- Users must have Google Drive configured first
- The Google Calendar API must be enabled in the user's Google Cloud Console project
- All calendar operations default to the "primary" calendar unless specified otherwise
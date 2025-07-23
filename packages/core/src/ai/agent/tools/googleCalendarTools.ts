import { createSimpleTool, convertToLangChainTool, createToolParameter } from './simplifiedTools';
import { checkGoogleDriveCredentials } from '../../../files/googleDrive';
import { config } from '../../../config/config';
import { loadGlobalAxiosCredentials } from '../../../middleware/axiosGlobalHeader';
import axios from 'axios';

/**
 * Check if Google Calendar/Google credentials are available
 */
const checkGoogleCalendarCredentials = async (): Promise<{
  hasCredentials: boolean;
  message?: string;
}> => {
  try {
    const credentialStatus = await checkGoogleDriveCredentials();
    return {
      hasCredentials: credentialStatus.hasCredentials,
      message: credentialStatus.hasCredentials 
        ? 'Google Calendar integration ready - using your existing Google credentials'
        : 'Google Calendar requires Google authentication. Please configure Google Drive integration first to enable Google Calendar.'
    };
  } catch (error) {
    console.error('Error checking Google Calendar credentials:', error);
    return {
      hasCredentials: false,
      message: 'Failed to check Google Calendar credentials'
    };
  }
};

/**
 * Make Google Calendar API request using the backend
 */
const makeGoogleCalendarRequest = async (endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any) => {
  try {
    const { token, apiKey } = loadGlobalAxiosCredentials();
    const effectiveApiKey = apiKey || 'dev_key_1';

    const response = await axios({
      method,
      url: `${config.url}/files/google_calendar/${endpoint}`,
      data,
      headers: {
        Authorization: `Bearer ${token}`,
        'X-API-Key': effectiveApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (response.data.error) {
      throw new Error(response.data.error);
    }

    return response.data;
  } catch (error) {
    console.error(`Google Calendar API request failed:`, error);
    throw error;
  }
};

/**
 * Create Google Calendar tools using simplified tool definitions
 */
export function createGoogleCalendarTools(enabled: boolean): any[] {
  if (!enabled) {
    return [];
  }

  // List Events Tool
  const listEventsTool = createSimpleTool(
    'GoogleCalendarListEvents',
    'List upcoming events from Google Calendar.',
    {
      timeMin: createToolParameter('string', 'Start time for events (ISO string)', { optional: true }),
      timeMax: createToolParameter('string', 'End time for events (ISO string)', { optional: true }),
      maxResults: createToolParameter('number', 'Maximum number of events to return', { default: 10, optional: true }),
      singleEvents: createToolParameter('boolean', 'Expand recurring events into instances', { default: true, optional: true })
    },
    async (params: { timeMin?: string; timeMax?: string; maxResults?: number; singleEvents?: boolean }) => {
      try {
        const credentialCheck = await checkGoogleCalendarCredentials();
        if (!credentialCheck.hasCredentials) {
          return `Google Calendar not available: ${credentialCheck.message}`;
        }

        const queryParams = new URLSearchParams();
        
        if (params.timeMin) queryParams.append('timeMin', params.timeMin);
        if (params.timeMax) queryParams.append('timeMax', params.timeMax);
        if (params.maxResults) queryParams.append('maxResults', params.maxResults.toString());
        if (params.singleEvents !== undefined) queryParams.append('singleEvents', params.singleEvents.toString());
        
        const result = await makeGoogleCalendarRequest(`events?${queryParams.toString()}`);
        
        if (!result.items || result.items.length === 0) {
          return 'No upcoming events found in Google Calendar';
        }

        const eventSummaries = result.items.map((event: any, index: number) => {
          const startTime = event.start?.dateTime || event.start?.date || 'No start time';
          const endTime = event.end?.dateTime || event.end?.date || 'No end time';
          
          return `${index + 1}. **${event.summary || 'No Title'}**\n   Start: ${startTime}\n   End: ${endTime}\n   Location: ${event.location || 'No location'}\n   Description: ${event.description || 'No description'}\n   ID: ${event.id}`;
        }).join('\n\n');

        return `Found ${result.items.length} upcoming events:\n\n${eventSummaries}`;
      } catch (error) {
        return `Error listing Google Calendar events: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  );

  // Create Event Tool
  const createEventTool = createSimpleTool(
    'GoogleCalendarCreateEvent',
    'Create a new event in Google Calendar.',
    {
      summary: createToolParameter('string', 'Event title/summary', { required: true }),
      startDateTime: createToolParameter('string', 'Event start date and time (ISO string)', { required: true }),
      endDateTime: createToolParameter('string', 'Event end date and time (ISO string)', { required: true }),
      description: createToolParameter('string', 'Event description', { optional: true }),
      location: createToolParameter('string', 'Event location', { optional: true }),
      attendees: createToolParameter('string', 'Attendee email addresses (comma-separated)', { optional: true })
    },
    async (params: { summary: string; startDateTime: string; endDateTime: string; description?: string; location?: string; attendees?: string }) => {
      try {
        const credentialCheck = await checkGoogleCalendarCredentials();
        if (!credentialCheck.hasCredentials) {
          return `Google Calendar not available: ${credentialCheck.message}`;
        }

        const eventData = {
          summary: params.summary,
          start: { dateTime: params.startDateTime },
          end: { dateTime: params.endDateTime },
          ...(params.description && { description: params.description }),
          ...(params.location && { location: params.location }),
          ...(params.attendees && { 
            attendees: params.attendees.split(',').map(email => ({ email: email.trim() })) 
          })
        };

        const result = await makeGoogleCalendarRequest('events', 'POST', eventData);
        
        return `Event created successfully!\n**Title:** ${result.summary}\n**Start:** ${result.start?.dateTime}\n**End:** ${result.end?.dateTime}\n**ID:** ${result.id}\n**Calendar Link:** ${result.htmlLink}`;
      } catch (error) {
        return `Error creating Google Calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  );

  // Update Event Tool
  const updateEventTool = createSimpleTool(
    'GoogleCalendarUpdateEvent',
    'Update an existing event in Google Calendar.',
    {
      eventId: createToolParameter('string', 'ID of the event to update', { required: true }),
      summary: createToolParameter('string', 'Updated event title/summary', { optional: true }),
      startDateTime: createToolParameter('string', 'Updated start date and time (ISO string)', { optional: true }),
      endDateTime: createToolParameter('string', 'Updated end date and time (ISO string)', { optional: true }),
      description: createToolParameter('string', 'Updated event description', { optional: true }),
      location: createToolParameter('string', 'Updated event location', { optional: true })
    },
    async (params: { eventId: string; summary?: string; startDateTime?: string; endDateTime?: string; description?: string; location?: string }) => {
      try {
        const credentialCheck = await checkGoogleCalendarCredentials();
        if (!credentialCheck.hasCredentials) {
          return `Google Calendar not available: ${credentialCheck.message}`;
        }

        const updateData: any = {};
        if (params.summary) updateData.summary = params.summary;
        if (params.startDateTime) updateData.start = { dateTime: params.startDateTime };
        if (params.endDateTime) updateData.end = { dateTime: params.endDateTime };
        if (params.description) updateData.description = params.description;
        if (params.location) updateData.location = params.location;

        const result = await makeGoogleCalendarRequest(`events/${params.eventId}`, 'PUT', updateData);
        
        return `Event updated successfully!\n**Title:** ${result.summary}\n**Start:** ${result.start?.dateTime}\n**End:** ${result.end?.dateTime}\n**ID:** ${result.id}`;
      } catch (error) {
        return `Error updating Google Calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  );

  // Delete Event Tool
  const deleteEventTool = createSimpleTool(
    'GoogleCalendarDeleteEvent',
    'Delete an event from Google Calendar.',
    {
      eventId: createToolParameter('string', 'ID of the event to delete', { required: true })
    },
    async (params: { eventId: string }) => {
      try {
        const credentialCheck = await checkGoogleCalendarCredentials();
        if (!credentialCheck.hasCredentials) {
          return `Google Calendar not available: ${credentialCheck.message}`;
        }

        await makeGoogleCalendarRequest(`events/${params.eventId}`, 'DELETE');
        
        return `Event with ID ${params.eventId} has been successfully deleted from Google Calendar`;
      } catch (error) {
        return `Error deleting Google Calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  );

  // Get Event Details Tool
  const getEventTool = createSimpleTool(
    'GoogleCalendarGetEvent',
    'Get detailed information about a specific event.',
    {
      eventId: createToolParameter('string', 'ID of the event to retrieve', { required: true })
    },
    async (params: { eventId: string }) => {
      try {
        const credentialCheck = await checkGoogleCalendarCredentials();
        if (!credentialCheck.hasCredentials) {
          return `Google Calendar not available: ${credentialCheck.message}`;
        }

        const result = await makeGoogleCalendarRequest(`events/${params.eventId}`);
        
        const startTime = result.start?.dateTime || result.start?.date || 'No start time';
        const endTime = result.end?.dateTime || result.end?.date || 'No end time';
        const attendees = result.attendees ? result.attendees.map((att: any) => att.email).join(', ') : 'No attendees';
        
        return `**Event Details:**\n\n**Title:** ${result.summary || 'No title'}\n**Start:** ${startTime}\n**End:** ${endTime}\n**Location:** ${result.location || 'No location'}\n**Description:** ${result.description || 'No description'}\n**Attendees:** ${attendees}\n**Status:** ${result.status}\n**Created:** ${result.created}\n**Updated:** ${result.updated}\n**Calendar Link:** ${result.htmlLink}`;
      } catch (error) {
        return `Error retrieving Google Calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  );

  // List Calendars Tool
  const listCalendarsTool = createSimpleTool(
    'GoogleCalendarListCalendars',
    'List all available Google Calendars.',
    {},
    async () => {
      try {
        const credentialCheck = await checkGoogleCalendarCredentials();
        if (!credentialCheck.hasCredentials) {
          return `Google Calendar not available: ${credentialCheck.message}`;
        }

        const result = await makeGoogleCalendarRequest('calendars');
        
        if (!result.items || result.items.length === 0) {
          return 'No calendars found';
        }

        const calendarList = result.items.map((calendar: any, index: number) => 
          `${index + 1}. **${calendar.summary}**\n   ID: ${calendar.id}\n   Access: ${calendar.accessRole}\n   Primary: ${calendar.primary ? 'Yes' : 'No'}`
        ).join('\n\n');

        return `Available Google Calendars:\n\n${calendarList}`;
      } catch (error) {
        return `Error listing Google Calendars: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  );

  // Convert simplified tools to LangChain-compatible format
  return [
    convertToLangChainTool(listEventsTool),
    convertToLangChainTool(createEventTool),
    convertToLangChainTool(updateEventTool),
    convertToLangChainTool(deleteEventTool),
    convertToLangChainTool(getEventTool),
    convertToLangChainTool(listCalendarsTool)
  ];
} 
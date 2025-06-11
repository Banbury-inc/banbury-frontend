import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { checkGoogleDriveCredentials } from '../../../files/googleDrive';
import { config } from '../../../config/config';
import { loadGlobalAxiosCredentials } from '../../../middleware/axiosGlobalHeader';
import axios from 'axios';


/**
 * Check if Google Calendar/Google credentials are available
 * Since Google Calendar uses the same Google API credentials as Google Drive,
 * we check for Google Drive credentials
 */
const checkGoogleCalendarCredentials = async (): Promise<{
  hasCredentials: boolean;
  message?: string;
}> => {
  try {
    // Use the same credential check as Google Drive since they share credentials
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
 * Create Google Calendar tools that use the existing Google Drive credentials
 */
export function createGoogleCalendarTools(enabled: boolean): DynamicStructuredTool[] {
  if (!enabled) {
    return [];
  }

  const tools: DynamicStructuredTool[] = [];

  // Google Calendar List Events Tool
  tools.push(
    new DynamicStructuredTool({
      name: 'GoogleCalendarListEvents',
      description: 'List calendar events from Google Calendar. Can filter by date range and other criteria.',
      schema: z.object({
        timeMin: z.string().optional().describe('Lower bound for event start time (RFC3339 timestamp, e.g. "2024-01-01T00:00:00Z")'),
        timeMax: z.string().optional().describe('Upper bound for event start time (RFC3339 timestamp, e.g. "2024-12-31T23:59:59Z")'),
        maxResults: z.number().optional().default(50).describe('Maximum number of events to return'),
        q: z.string().optional().describe('Free text search terms to find events'),
        calendarId: z.string().optional().default('primary').describe('Calendar identifier (default is "primary" for the main calendar)'),
      }),
      func: async ({ timeMin, timeMax, maxResults = 50, q, calendarId = 'primary' }) => {
        try {
          const credentialCheck = await checkGoogleCalendarCredentials();
          if (!credentialCheck.hasCredentials) {
            return `Google Calendar not available: ${credentialCheck.message}`;
          }

          const params = new URLSearchParams();
          if (timeMin) params.append('timeMin', timeMin);
          if (timeMax) params.append('timeMax', timeMax);
          if (maxResults) params.append('maxResults', maxResults.toString());
          if (q) params.append('q', q);
          params.append('calendarId', calendarId);

          const result = await makeGoogleCalendarRequest(`events?${params.toString()}`);
          
          if (!result.events || result.events.length === 0) {
            return `No events found for the specified criteria.`;
          }

          const eventSummaries = result.events.map((event: any, index: number) => {
            const start = event.start?.dateTime || event.start?.date || 'No start time';
            const end = event.end?.dateTime || event.end?.date || 'No end time';
            const attendees = event.attendees ? event.attendees.map((a: any) => a.email).join(', ') : 'None';
            
            return `${index + 1}. ${event.summary || 'No title'}
   When: ${start} - ${end}
   Location: ${event.location || 'No location'}
   Status: ${event.status || 'Unknown'}
   Attendees: ${attendees}
   Event ID: ${event.id}`;
          });

          return `Found ${eventSummaries.length} events:\n\n${eventSummaries.join('\n\n')}`;

        } catch (error) {
          return `Error listing calendar events: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    })
  );

  // Google Calendar Get Event Tool
  tools.push(
    new DynamicStructuredTool({
      name: 'GoogleCalendarGetEvent',
      description: 'Get the full details of a specific calendar event by its ID.',
      schema: z.object({
        eventId: z.string().describe('The unique ID of the calendar event to retrieve'),
        calendarId: z.string().optional().default('primary').describe('Calendar identifier (default is "primary" for the main calendar)'),
      }),
      func: async ({ eventId, calendarId = 'primary' }) => {
        try {
          const credentialCheck = await checkGoogleCalendarCredentials();
          if (!credentialCheck.hasCredentials) {
            return `Google Calendar not available: ${credentialCheck.message}`;
          }

          const result = await makeGoogleCalendarRequest(`event/${calendarId}/${eventId}`);
          
          const start = result.start?.dateTime || result.start?.date || 'No start time';
          const end = result.end?.dateTime || result.end?.date || 'No end time';
          const attendees = result.attendees ? 
            result.attendees.map((a: any) => `${a.email} (${a.responseStatus || 'no response'})`).join('\n   ') : 
            'None';

          return `Event Details:
Title: ${result.summary || 'No title'}
When: ${start} - ${end}
Location: ${result.location || 'No location'}
Status: ${result.status || 'Unknown'}
Description: ${result.description || 'No description'}
Organizer: ${result.organizer?.email || 'Unknown'}
Attendees:
   ${attendees}
Event ID: ${result.id}
Link: ${result.htmlLink || 'No link available'}`;

        } catch (error) {
          return `Error retrieving event: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    })
  );

  // Google Calendar Create Event Tool
  tools.push(
    new DynamicStructuredTool({
      name: 'GoogleCalendarCreateEvent',
      description: 'Create a new calendar event in Google Calendar.',
      schema: z.object({
        summary: z.string().describe('Event title/summary'),
        startDateTime: z.string().describe('Event start time (RFC3339 timestamp, e.g. "2024-01-01T10:00:00-07:00")'),
        endDateTime: z.string().describe('Event end time (RFC3339 timestamp, e.g. "2024-01-01T11:00:00-07:00")'),
        description: z.string().optional().describe('Event description'),
        location: z.string().optional().describe('Event location'),
        attendees: z.array(z.string()).optional().describe('Array of attendee email addresses'),
        calendarId: z.string().optional().default('primary').describe('Calendar identifier (default is "primary" for the main calendar)'),
      }),
      func: async ({ summary, startDateTime, endDateTime, description, location, attendees, calendarId = 'primary' }) => {
        try {
          const credentialCheck = await checkGoogleCalendarCredentials();
          if (!credentialCheck.hasCredentials) {
            return `Google Calendar not available: ${credentialCheck.message}`;
          }

          const eventData = {
            summary,
            description,
            location,
            start: { dateTime: startDateTime },
            end: { dateTime: endDateTime },
            attendees: attendees?.map(email => ({ email })),
            calendarId
          };

          const result = await makeGoogleCalendarRequest('event', 'POST', eventData);
          
          return `Event created successfully!
Event ID: ${result.id}
Title: ${summary}
When: ${startDateTime} - ${endDateTime}
Location: ${location || 'No location'}
Attendees: ${attendees?.join(', ') || 'None'}
Status: Created
Link: ${result.htmlLink || 'No link available'}`;

        } catch (error) {
          return `Error creating event: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    })
  );

  // Google Calendar Update Event Tool
  tools.push(
    new DynamicStructuredTool({
      name: 'GoogleCalendarUpdateEvent',
      description: 'Update an existing calendar event in Google Calendar.',
      schema: z.object({
        eventId: z.string().describe('The unique ID of the calendar event to update'),
        summary: z.string().optional().describe('Updated event title/summary'),
        startDateTime: z.string().optional().describe('Updated start time (RFC3339 timestamp)'),
        endDateTime: z.string().optional().describe('Updated end time (RFC3339 timestamp)'),
        description: z.string().optional().describe('Updated event description'),
        location: z.string().optional().describe('Updated event location'),
        attendees: z.array(z.string()).optional().describe('Updated array of attendee email addresses'),
        calendarId: z.string().optional().default('primary').describe('Calendar identifier'),
      }),
      func: async ({ eventId, summary, startDateTime, endDateTime, description, location, attendees, calendarId = 'primary' }) => {
        try {
          const credentialCheck = await checkGoogleCalendarCredentials();
          if (!credentialCheck.hasCredentials) {
            return `Google Calendar not available: ${credentialCheck.message}`;
          }

          const updateData: any = { calendarId, eventId };
          if (summary !== undefined) updateData.summary = summary;
          if (description !== undefined) updateData.description = description;
          if (location !== undefined) updateData.location = location;
          if (startDateTime !== undefined) updateData.start = { dateTime: startDateTime };
          if (endDateTime !== undefined) updateData.end = { dateTime: endDateTime };
          if (attendees !== undefined) updateData.attendees = attendees.map(email => ({ email }));

          const result = await makeGoogleCalendarRequest('event', 'PUT', updateData);
          
          return `Event updated successfully!
Event ID: ${result.id}
Title: ${result.summary || 'No title'}
Status: Updated
Link: ${result.htmlLink || 'No link available'}`;

        } catch (error) {
          return `Error updating event: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    })
  );

  // Google Calendar Delete Event Tool
  tools.push(
    new DynamicStructuredTool({
      name: 'GoogleCalendarDeleteEvent',
      description: 'Delete a calendar event from Google Calendar.',
      schema: z.object({
        eventId: z.string().describe('The unique ID of the calendar event to delete'),
        calendarId: z.string().optional().default('primary').describe('Calendar identifier'),
      }),
      func: async ({ eventId, calendarId = 'primary' }) => {
        try {
          const credentialCheck = await checkGoogleCalendarCredentials();
          if (!credentialCheck.hasCredentials) {
            return `Google Calendar not available: ${credentialCheck.message}`;
          }

          await makeGoogleCalendarRequest(`event/${calendarId}/${eventId}`, 'DELETE');
          
          return `Event deleted successfully!
Event ID: ${eventId}
Status: Deleted`;

        } catch (error) {
          return `Error deleting event: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    })
  );

  return tools;
}
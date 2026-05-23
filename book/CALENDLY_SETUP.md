/**
 * Backend handler for Calendly API integration
 * This file should be deployed on your backend server (Node.js, Python, etc.)
 * 
 * Installation:
 * 1. Install Calendly SDK: npm install calendly
 * 2. Set environment variables:
 *    - CALENDLY_API_KEY=your_calendly_api_key
 *    - CALENDLY_USERNAME=your_calendly_username
 *    - GOOGLE_CALENDAR_ID=your_google_calendar_id
 *    - GOOGLE_API_KEY=your_google_api_key
 * 3. Setup this endpoint to handle POST requests from /api/create-calendly-event
 */

// Example implementation for Node.js/Express:
/*
const express = require('express');
const app = express();
const axios = require('axios');

app.use(express.json());

// Calendly API Configuration
const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY;
const CALENDLY_API_URL = 'https://calendly.com/api/v1';

// Google Calendar API Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
const GOOGLE_API_URL = 'https://www.googleapis.com/calendar/v3';

app.post('/api/create-calendly-event', async (req, res) => {
  try {
    const { name, email, phone, notes, start_time, end_time, invitee_first_name, invitee_last_name } = req.body;

    // Step 1: Create event on Calendly
    const calendlyEventResponse = await axios.post(
      `${CALENDLY_API_URL}/scheduled_events`,
      {
        email: email,
        name: name,
        notes: notes,
        invitee_first_name: invitee_first_name,
        invitee_last_name: invitee_last_name,
        invitee_email: email,
        start_time: start_time,
        end_time: end_time
      },
      {
        headers: {
          'Authorization': `Bearer ${CALENDLY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const eventUri = calendlyEventResponse.data.resource.uri;

    // Step 2: Create Google Meet event via Google Calendar API
    const googleMeetEventResponse = await axios.post(
      `${GOOGLE_API_URL}/calendars/${GOOGLE_CALENDAR_ID}/events`,
      {
        summary: `matchking Demo - ${name}`,
        description: `Client: ${name}\nPhone: ${phone}\nExperience: ${notes}\n\nmatchking 30-minute demo session`,
        start: {
          dateTime: start_time,
          timeZone: 'Africa/Nairobi'
        },
        end: {
          dateTime: end_time,
          timeZone: 'Africa/Nairobi'
        },
        attendees: [
          {
            email: email,
            displayName: name,
            responseStatus: 'needsAction'
          }
        ],
        conferenceData: {
          createRequest: {
            requestId: `matchking-${Date.now()}`,
            conferenceSolutionKey: {
              key: 'hangoutsMeet'
            }
          }
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 1440 }, // 1 day before
            { method: 'email', minutes: 60 }    // 1 hour before
          ]
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${GOOGLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        params: {
          conferenceDataVersion: 1,
          sendNotifications: true
        }
      }
    );

    const meetingLink = googleMeetEventResponse.data.conferenceData.entryPoints[0].uri;
    const calendarEventLink = googleMeetEventResponse.data.htmlLink;

    // Step 3: Send confirmation email
    // TODO: Implement email sending (SendGrid, AWS SES, etc.)

    res.json({
      success: true,
      meeting_link: meetingLink,
      calendar_link: calendarEventLink,
      event_uri: eventUri
    });

  } catch (error) {
    console.error('Error creating event:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create event',
      message: error.message
    });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
*/

/**
 * Alternative: Using Calendly's Webhook API (Recommended)
 * 
 * Instead of creating events directly, you can:
 * 1. Generate a unique Calendly booking link for your availability
 * 2. Use webhooks to listen for booking events
 * 3. Automatically create Google Meet when booking is confirmed
 * 
 * Setup:
 * 1. Go to Calendly Settings > Webhooks
 * 2. Create webhook pointing to your backend: https://yourdomain.com/api/calendly-webhook
 * 3. Listen for "invitee.created" and "invitee.updated" events
 * 4. Create Google Meet meeting when event is confirmed
 */

/**
 * Setup Instructions:
 * 
 * 1. Get Calendly API Key:
 *    - Login to Calendly
 *    - Go to Settings > Integrations & Apps > API & Webhooks
 *    - Generate Personal Access Token
 * 
 * 2. Get Google Calendar API Key:
 *    - Go to Google Cloud Console
 *    - Create OAuth 2.0 credentials
 *    - Download credentials JSON
 * 
 * 3. Deploy backend handler
 * 
 * 4. Update booking page script.js with your actual API key and configuration
 */

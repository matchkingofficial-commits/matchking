/**
 * Netlify Function: Create Calendly Event
 * Place this file in: netlify/functions/create-calendly-event.js
 * 
 * This function runs on a server and can call the Calendly API
 * without CORS restrictions.
 */

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const {
      fullName,
      email,
      phone,
      experience,
      startTime,
      endTime,
      calendlyApiKey,
      clientTimezone,
      clientLocalTime
    } = JSON.parse(event.body);

    // Validate required fields
    if (!fullName || !email || !startTime || !endTime || !calendlyApiKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Step 1: Get user info from Calendly
    const userResponse = await fetch('https://calendly.com/api/v1/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${calendlyApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.ok) {
      throw new Error(`Calendly API error: ${userResponse.status} ${userResponse.statusText}`);
    }

    const userData = await userResponse.json();
    const userUri = userData.resource.uri;

    // Step 2: Get event types
    const eventTypesResponse = await fetch('https://calendly.com/api/v1/event_types', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${calendlyApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!eventTypesResponse.ok) {
      throw new Error('Failed to fetch event types');
    }

    const eventTypesData = await eventTypesResponse.json();

    if (!eventTypesData.collection || eventTypesData.collection.length === 0) {
      throw new Error('No event types found');
    }

    // Find demo event type
    const demoEvent = eventTypesData.collection.find(e =>
      e.name.toLowerCase().includes('demo') || e.name.toLowerCase().includes('matchking')
    ) || eventTypesData.collection[0];

    const eventTypeUri = demoEvent.uri;

    // Step 3: Create scheduled event
    const firstName = fullName.split(' ')[0];
    const lastName = fullName.split(' ').slice(1).join(' ') || 'User';

    const eventResponse = await fetch(`${eventTypeUri}/scheduled_events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${calendlyApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        start_time: startTime,
        end_time: endTime,
        invitee: {
          email: email,
          name: fullName,
          first_name: firstName,
          last_name: lastName
        },
        invitee_specified_location: phone,
        additional_notes: `Phone: ${phone}\nExperience Level: ${experience}\nClient Timezone: ${clientTimezone}\nClient Local Time: ${clientLocalTime}`
      })
    });

    if (!eventResponse.ok) {
      const errorData = await eventResponse.json();
      console.error('Event creation error:', errorData);
      throw new Error(`Failed to create event: ${eventResponse.status}`);
    }

    const eventData = await eventResponse.json();

    // Step 4: Send confirmation email (optional - requires email service)
    // This could integrate with SendGrid, AWS SES, etc.

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Event created successfully',
        event: {
          uri: eventData.resource.uri,
          event_type: demoEvent.name,
          calendar_event_url: eventData.resource.calendar_event_url,
          scheduling_url: demoEvent.scheduling_url
        }
      })
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to create event'
      })
    };
  }
};

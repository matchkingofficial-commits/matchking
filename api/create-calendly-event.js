/**
 * Vercel Serverless Function: Create Calendly Event
 * Place this file in: api/create-calendly-event.js
 * 
 * This function runs on Vercel and handles Calendly API calls
 * without CORS restrictions.
 */

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !startTime || !endTime || !calendlyApiKey) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: { fullName, email, startTime, endTime, calendlyApiKey: calendlyApiKey ? '***' : 'missing' }
      });
    }

    console.log(`Creating event for: ${fullName} (${email})`);
    console.log(`Time: ${startTime} to ${endTime}`);

    // Step 1: Get user info from Calendly
    console.log('Step 1: Fetching user info...');
    const userResponse = await fetch('https://calendly.com/api/v1/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${calendlyApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error(`User fetch failed: ${userResponse.status} - ${errorText}`);
      throw new Error(`Calendly API error: ${userResponse.status} ${userResponse.statusText}`);
    }

    const userData = await userResponse.json();
    const userUri = userData.resource.uri;
    console.log(`✓ User fetched: ${userData.resource.name}`);

    // Step 2: Get event types
    console.log('Step 2: Fetching event types...');
    const eventTypesResponse = await fetch('https://calendly.com/api/v1/event_types', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${calendlyApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!eventTypesResponse.ok) {
      const errorText = await eventTypesResponse.text();
      console.error(`Event types fetch failed: ${eventTypesResponse.status} - ${errorText}`);
      throw new Error('Failed to fetch event types');
    }

    const eventTypesData = await eventTypesResponse.json();

    if (!eventTypesData.collection || eventTypesData.collection.length === 0) {
      throw new Error('No event types found in Calendly account');
    }

    // Find demo event type
    const demoEvent = eventTypesData.collection.find(e =>
      e.name.toLowerCase().includes('demo') || e.name.toLowerCase().includes('matchking')
    ) || eventTypesData.collection[0];

    const eventTypeUri = demoEvent.uri;
    console.log(`✓ Using event type: ${demoEvent.name}`);

    // Step 3: Create scheduled event
    console.log('Step 3: Creating scheduled event...');
    const firstName = fullName.split(' ')[0];
    const lastName = fullName.split(' ').slice(1).join(' ') || 'User';

    const eventPayload = {
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
    };

    console.log('Event payload:', JSON.stringify(eventPayload, null, 2));

    const eventResponse = await fetch(`${eventTypeUri}/scheduled_events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${calendlyApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventPayload)
    });

    if (!eventResponse.ok) {
      const errorData = await eventResponse.json();
      console.error('Event creation error:', errorData);
      throw new Error(`Failed to create event: ${eventResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const eventData = await eventResponse.json();
    console.log(`✓ Event created successfully`);
    console.log('Event URI:', eventData.resource.uri);

    // Success response
    return res.status(200).json({
      success: true,
      message: 'Event created successfully',
      event: {
        uri: eventData.resource.uri,
        event_type: demoEvent.name,
        calendar_event_url: eventData.resource.calendar_event_url,
        scheduling_url: demoEvent.scheduling_url,
        start_time: eventData.resource.start_time,
        end_time: eventData.resource.end_time
      }
    });
  } catch (error) {
    console.error('Function error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create event',
      timestamp: new Date().toISOString()
    });
  }
}

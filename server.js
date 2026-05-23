/**
 * Local development server for matchking
 * Run with: node server.js
 * Access at: http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Your Calendly API key (from environment variable or hardcoded for dev)
const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY || 'your-api-key-here';

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse URL
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // API endpoint for creating Calendly event
  if (pathname === '/api/create-calendly-event' && req.method === 'POST') {
    handleCreateCalendlyEvent(req, res);
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  // Security: prevent directory traversal
  const realPath = path.resolve(filePath);
  if (!realPath.startsWith(path.resolve(__dirname))) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Forbidden' }));
    return;
  }

  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('404 Not Found');
      return;
    }

    // Determine content type
    const ext = path.extname(filePath);
    const contentType = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml'
    }[ext] || 'application/octet-stream';

    // Read and serve file
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('500 Internal Server Error');
        return;
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

/**
 * Handle POST /api/create-calendly-event
 * Creates a Calendly event via the API
 */
async function handleCreateCalendlyEvent(req, res) {
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const bookingData = JSON.parse(body);
      const {
        fullName,
        email,
        phone,
        experience,
        startTime,
        endTime,
        clientTimezone,
        clientLocalTime
      } = bookingData;

      console.log(`\n📅 Creating event for: ${fullName} (${email})`);
      console.log(`⏰ Time: ${startTime} to ${endTime}`);
      console.log(`🌍 Client Timezone: ${clientTimezone}`);

      // Step 1: Get user info from Calendly
      console.log('\n📡 Step 1: Fetching user info...');
      const userResponse = await fetch('https://calendly.com/api/v1/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CALENDLY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error(`❌ User fetch failed: ${userResponse.status} - ${errorText}`);
        throw new Error(`Calendly API error: ${userResponse.status}`);
      }

      const userData = await userResponse.json();
      const userUri = userData.resource.uri;
      console.log(`✅ User fetched: ${userData.resource.name}`);

      // Step 2: Get event types
      console.log('\n📡 Step 2: Fetching event types...');
      const eventTypesResponse = await fetch('https://calendly.com/api/v1/event_types', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CALENDLY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!eventTypesResponse.ok) {
        const errorText = await eventTypesResponse.text();
        console.error(`❌ Event types fetch failed: ${eventTypesResponse.status}`);
        throw new Error('Failed to fetch event types');
      }

      const eventTypesData = await eventTypesResponse.json();

      if (!eventTypesData.collection || eventTypesData.collection.length === 0) {
        throw new Error('No event types found in Calendly account');
      }

      // Find demo event type or use first one
      const demoEvent = eventTypesData.collection.find(e =>
        e.name.toLowerCase().includes('demo') || 
        e.name.toLowerCase().includes('matchking') ||
        e.name.toLowerCase().includes('30')
      ) || eventTypesData.collection[0];

      const eventTypeUri = demoEvent.uri;
      console.log(`✅ Using event type: "${demoEvent.name}" (${demoEvent.duration} min)`);

      // Step 3: Create scheduled event
      console.log('\n📡 Step 3: Creating scheduled event...');
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
        invitee_specified_location: phone || 'Google Meet',
        additional_notes: `Phone: ${phone || 'N/A'}\nExperience: ${experience || 'N/A'}\nTimezone: ${clientTimezone}\nLocal Time: ${clientLocalTime}`
      };

      const eventResponse = await fetch(`${eventTypeUri}/scheduled_events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CALENDLY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventPayload)
      });

      if (!eventResponse.ok) {
        const errorData = await eventResponse.json();
        console.error('❌ Event creation failed:', errorData);
        throw new Error(`Failed to create event: ${JSON.stringify(errorData.details || errorData)}`);
      }

      const eventData = await eventResponse.json();
      console.log('✅ Event created successfully!');
      console.log(`📍 Event URI: ${eventData.resource.uri}`);

      // Success response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Event created successfully',
        event: {
          uri: eventData.resource.uri,
          event_type: demoEvent.name,
          calendar_event_url: eventData.resource.calendar_event_url || null,
          scheduling_url: demoEvent.scheduling_url,
          start_time: eventData.resource.start_time,
          end_time: eventData.resource.end_time
        }
      }));
    } catch (error) {
      console.error('\n❌ Server error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: error.message || 'Failed to create event',
        timestamp: new Date().toISOString()
      }));
    }
  });
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 matchking server running at http://localhost:${PORT}`);
  console.log(`📖 Landing page: http://localhost:${PORT}`);
  console.log(`📅 Booking page: http://localhost:${PORT}/book`);
  console.log(`\n⏹️  Press Ctrl+C to stop\n`);
});
const express = require("express");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// EMAIL TRANSPORT


// DEMO REQUEST ROUTE


app.listen(3000, () => {
  console.log("Server running on port 3000");
});
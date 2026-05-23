# Calendly Integration - Backend Setup

## Issue: CORS Error

The Calendly API doesn't allow direct calls from browsers due to CORS restrictions. You need a backend server to proxy the API calls.

## Solution Options

### Option 1: Netlify Functions (Easiest - Recommended)

**Setup:**

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. In your project root, create the functions folder:
```bash
mkdir -p netlify/functions
```

3. Copy `create-calendly-event.js` to `netlify/functions/`

4. Create `netlify.toml` in project root:
```toml
[build]
  command = "echo 'Building...'"
  functions = "netlify/functions"
  publish = "."

[dev]
  framework = "#static"
  command = "python -m http.server 8000"
  port = 8000
```

5. Deploy to Netlify:
```bash
netlify deploy --prod
```

6. Update the frontend to use your Netlify domain:
```javascript
// In book/script.js, the function will auto-detect:
const response = await fetch('/.netlify/functions/create-calendly-event', {
  // ... request body
});
```

---

### Option 2: Node.js/Express Server (Local Development)

**Setup:**

1. Create `server.js` in your project root:

```javascript
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

app.post('/api/create-calendly-event', async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      experience,
      startTime,
      endTime,
      calendlyApiKey
    } = req.body;

    // Step 1: Get user info
    const userResponse = await fetch('https://calendly.com/api/v1/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${calendlyApiKey}`,
        'Content-Type': 'application/json'
      }
    });

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

    const eventTypesData = await eventTypesResponse.json();
    const demoEvent = eventTypesData.collection.find(e =>
      e.name.toLowerCase().includes('demo') || e.name.toLowerCase().includes('matchking')
    ) || eventTypesData.collection[0];

    // Step 3: Create scheduled event
    const eventResponse = await fetch(`${demoEvent.uri}/scheduled_events`, {
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
          first_name: fullName.split(' ')[0],
          last_name: fullName.split(' ').slice(1).join(' ') || 'User'
        },
        additional_notes: `Phone: ${phone}\nExperience: ${experience}`
      })
    });

    const eventData = await eventResponse.json();

    res.json({
      success: true,
      event: {
        uri: eventData.resource.uri,
        event_type: demoEvent.name,
        scheduling_url: demoEvent.scheduling_url
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

2. Install dependencies:
```bash
npm install express cors body-parser node-fetch
```

3. Start server:
```bash
node server.js
```

4. Update frontend in `book/script.js`:
```javascript
const response = await fetch('http://localhost:3000/api/create-calendly-event', {
  // ... request body
});
```

---

### Option 3: Python Flask (Alternative)

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json

app = Flask(__name__)
CORS(app)

@app.route('/api/create-calendly-event', methods=['POST'])
def create_event():
    try:
        data = request.json
        calendly_api_key = data.get('calendlyApiKey')
        
        headers = {
            'Authorization': f'Bearer {calendly_api_key}',
            'Content-Type': 'application/json'
        }
        
        # Get user info
        user_response = requests.get(
            'https://calendly.com/api/v1/users/me',
            headers=headers
        )
        user_data = user_response.json()
        
        # Get event types
        events_response = requests.get(
            'https://calendly.com/api/v1/event_types',
            headers=headers
        )
        events_data = events_response.json()
        demo_event = events_data['collection'][0]
        
        # Create event
        event_data = {
            'start_time': data.get('startTime'),
            'end_time': data.get('endTime'),
            'invitee': {
                'email': data.get('email'),
                'name': data.get('fullName'),
                'first_name': data.get('fullName').split(' ')[0],
                'last_name': ' '.join(data.get('fullName').split(' ')[1:]) or 'User'
            }
        }
        
        event_response = requests.post(
            f"{demo_event['uri']}/scheduled_events",
            headers=headers,
            json=event_data
        )
        
        return jsonify({
            'success': True,
            'event': event_response.json()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

---

## Testing

1. **Start your backend** (Netlify, Node, or Python)

2. **Open the booking page** in browser

3. **Fill in the form** and submit

4. **Check backend logs** for successful event creation

5. **Verify in Calendly** that the event was created

---

## Troubleshooting

**"Function not found"** 
- Make sure `netlify/functions/create-calendly-event.js` exists
- Run `netlify dev` to test locally before deploying

**"401 Unauthorized"**
- Check that your Calendly API key is correct
- Verify the token hasn't expired

**"No event types found"**
- Make sure you have at least one event type created in Calendly
- Check Calendly account settings

**"CORS still failing"**
- Use a backend server (Node, Python, etc.)
- Don't call Calendly API directly from browser

---

## Production Deployment

### Netlify:
```bash
netlify deploy --prod
```

### Heroku:
```bash
heroku create your-app-name
heroku config:set CALENDLY_API_KEY=your_key
git push heroku main
```

### Vercel:
```bash
vercel
# Follow prompts
```

---

## Security Note

Never expose your Calendly API key in client-side code. Always:
- Keep API keys in environment variables
- Use a backend server to proxy API calls
- Never commit API keys to version control

Your current setup has the key in the frontend for demo purposes. 
**For production, move it to environment variables on the backend.**

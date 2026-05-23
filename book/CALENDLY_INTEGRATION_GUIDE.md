# Calendly Integration Setup Guide

## Quick Start (Recommended - Embed Calendly Link)

The simplest approach is to embed your Calendly booking link directly:

### Step 1: Create your Calendly account
1. Go to https://calendly.com
2. Sign up and create an account
3. Set your availability (10 AM - 5 PM Kenya Time)

### Step 2: Create Event Type
1. Go to Calendly Settings
2. Create a new event type:
   - Name: "matchking Demo"
   - Duration: 30 minutes
   - Description: "Automated Market Analysis for Volatility Trading"
3. Add Google Meet as video conferencing option
4. Set availability (10 AM - 5 PM Africa/Nairobi timezone)

### Step 3: Get your booking link
1. Go to your public profile
2. Copy your Calendly booking link
3. Update the booking page to redirect to Calendly

---

## Advanced Setup (Full Integration with Google Meet)

If you want full control and automatic Google Meet generation:

### Requirements:
- Node.js/Express server (or similar backend)
- Calendly API Key
- Google Calendar API credentials

### Step 1: Get Calendly API Key
1. Login to Calendly
2. Go to Settings > Integrations & Apps > API & Webhooks
3. Click "Generate Personal Access Token"
4. Copy and save the token

### Step 2: Setup Google Calendar API
1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable "Google Calendar API"
4. Create OAuth 2.0 credentials (Service Account)
5. Download the credentials JSON file

### Step 3: Setup Backend
Use the Node.js/Express example in this folder's script to create an endpoint that:
- Receives booking data from the client
- Creates event in Calendly
- Creates event in Google Calendar with Google Meet
- Returns the Google Meet link

### Step 4: Environment Variables
Set these on your server:
```
CALENDLY_API_KEY=your_api_key_here
GOOGLE_API_KEY=your_google_api_key
GOOGLE_CALENDAR_ID=your_calendar_id@gmail.com
```

### Step 5: Update Frontend
In `book/script.js`, set:
```javascript
const CALENDLY_API_KEY = 'YOUR_CALENDLY_API_KEY';
const CALENDLY_USERNAME = 'YOUR_CALENDLY_USERNAME';
const CALENDLY_EVENT_TYPE_ID = 'YOUR_EVENT_TYPE_ID';
```

---

## Option A: Simple Redirect to Calendly (Recommended for MVP)

1. Replace the form submission with a redirect:
```javascript
// In book/script.js, modify handleFormSubmit:
function handleFormSubmit(e) {
  e.preventDefault();
  const calendlyLink = 'https://calendly.com/your-username/matchking-demo';
  window.location.href = calendlyLink;
}
```

2. Calendly automatically:
   - Converts times to client's timezone ✓
   - Creates Google Meet link ✓
   - Sends confirmation emails ✓
   - Manages your availability ✓

---

## Option B: Embed Calendly Widget

1. In `book/index.html`, replace the form with:
```html
<div class="calendly-inline-widget" 
     data-url="https://calendly.com/your-username/matchking-demo?hide_event_type_details=1&hide_gdpr_banner=1" 
     style="min-width:320px; height:700px;"></div>
<script type="text/javascript" src="https://assets.calendly.com/assets/external/widget.js"></script>
```

---

## Testing

### Test Calendly API Connection:
```bash
curl -H "Authorization: Bearer YOUR_CALENDLY_API_KEY" \
     https://calendly.com/api/v1/users/me
```

### Test Google Calendar API:
```bash
curl -H "Authorization: Bearer YOUR_GOOGLE_API_KEY" \
     "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=1"
```

---

## Troubleshooting

**Issue**: "Calendly API key not working"
- Solution: Make sure you generated a "Personal Access Token" not just an API key
- Verify token is not expired
- Check Authorization header format: `Bearer YOUR_TOKEN`

**Issue**: "Google Meet not appearing"
- Solution: Make sure `conferenceDataVersion=1` is in the request
- Verify Google Calendar API is enabled in Cloud Console
- Check that calendar ID is correct

**Issue**: "Timezone conversions wrong"
- Solution: Calendly handles timezone conversion automatically
- Make sure your Calendly event type is set to "Africa/Nairobi" timezone
- Calendly will show clients times in their timezone

---

## Support

For more details:
- Calendly API Docs: https://developer.calendly.com
- Google Calendar API: https://developers.google.com/calendar
- Calendly Status Page: https://status.calendly.com

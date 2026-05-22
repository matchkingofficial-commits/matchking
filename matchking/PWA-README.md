# deriv hacker PWA

deriv hacker is now available as a Progressive Web App (PWA) that provides a native app-like experience for Deriv market analysis and trading intelligence.

## Features

- 📱 **Install as App**: Install deriv hacker directly to your device's home screen
- 🔄 **Offline Support**: Core functionality works even without internet connection
- 🚀 **Fast Loading**: Cached resources for instant startup
- 🔔 **Push Notifications**: Real-time market updates (when enabled)
- 📊 **Native Feel**: Full-screen experience with native app behavior
- 🔄 **Auto Updates**: Automatic background updates with user notification

## Installation

### Desktop (Chrome, Edge, Brave)
1. Open deriv hacker in your browser
2. Look for the "Install" button in the address bar or click the install button on the page
3. Click "Install" in the popup dialog
4. deriv hacker will be added to your desktop and Start menu

### Mobile (Android)
1. Open deriv hacker in Chrome or Samsung Internet
2. Tap the "Add to Home Screen" option in the browser menu
3. Tap "Install" when prompted
4. deriv hacker will appear on your home screen like a native app

### Mobile (iOS)
1. Open deriv hacker in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" to confirm
5. deriv hacker will appear on your home screen

## PWA Features

### Offline Mode
- Core functionality works offline
- Data is cached for offline viewing
- Network status indicator shows connection state
- Automatic sync when connection is restored

### App-like Experience
- Full-screen display (no browser UI)
- Native navigation gestures
- Platform-specific optimizations
- Fast app switching

### Auto Updates
- Background updates download automatically
- User notification when updates are available
- One-click update installation
- No app store required

## Technical Details

### Files Structure
```
deriv hacker/
├── manifest.json          # PWA manifest configuration
├── sw.js                 # Service worker for caching and offline support
├── pwa-helper.js         # PWA utilities and installation logic
├── icon-generator.html   # Tool to generate PWA icons
├── browserconfig.xml     # Windows tile configuration
└── icons/               # PWA icons directory
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    └── icon-512x512.png
```

### Generating Icons
1. Open `deriv hacker/icon-generator.html` in your browser
2. Click "Generate All Icons"
3. Click "Download All Icons"
4. Save all downloaded icons to the `deriv hacker/icons/` folder

### Service Worker
The service worker (`sw.js`) handles:
- Caching of app resources
- Offline functionality
- Background updates
- Push notifications (when implemented)

### Manifest Configuration
The `manifest.json` file configures:
- App name and description
- Icons for different sizes
- Display mode (standalone)
- Theme colors
- Start URL
- Shortcuts and categories

## Browser Support

### Full PWA Support
- Chrome 73+
- Edge 79+
- Firefox 92+
- Safari 14.1+
- Samsung Internet 4+

### Basic Support
- Older browsers will fall back to regular web app functionality
- Icons and manifest still provide enhanced bookmark experience

## Development

### Testing PWA Features
1. Open Chrome DevTools
2. Go to Application tab
3. Check "Service Workers" and "Manifest" sections
4. Use "Lighthouse" audit for PWA scoring

### Local Development
```bash
# Serve the deriv hacker folder
npx http-server deriv hacker -p 8080

# Test PWA features
# Navigate to http://localhost:8080
```

### PWA Checklist
- ✅ Web App Manifest
- ✅ Service Worker
- ✅ HTTPS (required for PWA features)
- ✅ Responsive Design
- ✅ Icons (multiple sizes)
- ✅ Offline Support
- ✅ Fast Loading
- ✅ Cross-browser Compatibility

## Troubleshooting

### PWA Not Installing
- Ensure you're using HTTPS
- Check that manifest.json is valid
- Verify service worker is registered
- Clear browser cache and try again

### Offline Features Not Working
- Check service worker registration in DevTools
- Verify network requests are being cached
- Ensure proper cache invalidation

### Icons Not Showing
- Verify icon files exist in `/deriv hacker/icons/`
- Check icon paths in manifest.json
- Use icon-generator.html to create missing icons

## Security

- All network requests are secured with HTTPS
- Service worker only caches approved resources
- No sensitive data is stored in local cache
- OAuth authentication remains secure

---

For more information about PWA development, visit [web.dev/progressive-web-apps](https://web.dev/progressive-web-apps/)

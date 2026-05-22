// PWA Installation and Icon Generation Script
function createPWAIcon(size, canvas = null) {
  if (!canvas) {
    canvas = document.createElement('canvas');
  }
  
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Clear canvas
  ctx.clearRect(0, 0, size, size);
  
  // Draw background circle
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = (size / 2) - 4;
  
  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#00d4ff');
  gradient.addColorStop(1, '#0099cc');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fill();
  
  // Draw inner rectangle (terminal-like)
  const rectWidth = size * 0.6;
  const rectHeight = size * 0.4;
  const rectX = (size - rectWidth) / 2;
  const rectY = (size - rectHeight) / 2;
  
  ctx.fillStyle = '#0a0a0a';
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 2;
  ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
  ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
  
  // Draw "DS" text
  const fontSize = size * 0.2;
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.fillStyle = '#00d4ff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DS', centerX, centerY);
  
  return canvas;
}

function generateAndDownloadIcon(size) {
  const canvas = createPWAIcon(size);
  
  // Convert to blob and create download link
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `icon-${size}x${size}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

function generateAllIcons() {
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  
  sizes.forEach((size, index) => {
    setTimeout(() => {
      generateAndDownloadIcon(size);
    }, index * 500); // Delay to avoid overwhelming the browser
  });
}

// PWA Installation
let deferredPrompt;
let installButton;

function initializePWA() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/matchking/sw.js')
        .then((registration) => {
          console.log('ServiceWorker registration successful:', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showUpdateNotification();
              }
            });
          });
        })
        .catch((error) => {
          console.log('ServiceWorker registration failed:', error);
        });
    });
  }

  // Handle PWA install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA install prompt triggered');
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    hideInstallButton();
    showInstallSuccessMessage();
  });
}

function showInstallButton() {
  if (!installButton) {
    installButton = document.createElement('button');
    installButton.className = 'pwa-install-btn';
    installButton.innerHTML = `
      <i class="fas fa-download"></i>
      <span>Install App</span>
    `;
    installButton.onclick = installPWA;
    
    // Add to top bar if available, otherwise as fixed position button
    const topBar = document.querySelector('.top-bar-right');
    if (topBar) {
      topBar.appendChild(installButton);
    } else {
      // Fallback: create as fixed position button in top-right
      installButton.style.position = 'fixed';
      installButton.style.top = '20px';
      installButton.style.right = '20px';
      installButton.style.zIndex = '1000';
      document.body.appendChild(installButton);
    }
  }
  installButton.style.display = 'flex';
}

function hideInstallButton() {
  if (installButton) {
    installButton.style.display = 'none';
  }
}

function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
      } else {
        console.log('User dismissed the PWA install prompt');
      }
      deferredPrompt = null;
    });
  }
}

function showUpdateNotification() {
  const notification = document.createElement('div');
  notification.className = 'update-notification';
  notification.innerHTML = `
    <div class="update-content">
      <i class="fas fa-sync-alt"></i>
      <span>New version available!</span>
      <button onclick="updatePWA()">Update</button>
      <button onclick="dismissUpdate(this)">Later</button>
    </div>
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
}

function updatePWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  }
  location.reload();
}

function dismissUpdate(element) {
  const notification = element.closest('.update-notification');
  if (notification) {
    notification.remove();
  }
}

function showInstallSuccessMessage() {
  const message = document.createElement('div');
  message.className = 'install-success';
  message.innerHTML = `
    <div class="success-content">
      <i class="fas fa-check-circle"></i>
      <span>matchking installed successfully!</span>
    </div>
  `;
  document.body.appendChild(message);
  
  setTimeout(() => {
    message.classList.add('show');
    setTimeout(() => {
      message.remove();
    }, 3000);
  }, 100);
}

// Check if running as PWA
function isPWA() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

// Add PWA-specific styles and behavior
function enhancePWAExperience() {
  if (isPWA()) {
    document.body.classList.add('pwa-mode');
    
    // Hide browser UI elements that don't make sense in PWA
    const style = document.createElement('style');
    style.textContent = `
      .pwa-mode .external-link {
        pointer-events: none;
        opacity: 0.6;
      }
      
      .pwa-mode .browser-only {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializePWA();
    enhancePWAExperience();
    // Offline support disabled
  });
} else {
  initializePWA();
  enhancePWAExperience();
  // Offline support disabled
}

// Offline Support
function initializeOfflineSupport() {
  // Create offline indicator
  const offlineIndicator = document.createElement('div');
  offlineIndicator.className = 'offline-indicator';
  offlineIndicator.innerHTML = `
    <i class="fas fa-wifi-slash"></i>
    <span>No internet connection. Some features may be limited.</span>
  `;
  document.body.appendChild(offlineIndicator);

  let isActuallyOffline = false;

  // More reliable network status monitoring
  async function checkActualConnectivity() {
    try {
      // Try to fetch a tiny resource to confirm actual internet
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store'
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async function updateOnlineStatus() {
    // First check navigator.onLine (instant but unreliable)
    const navigatorOnline = navigator.onLine;
    
    // Then verify with actual connectivity check
    const hasInternet = await checkActualConnectivity();
    
    isActuallyOffline = !hasInternet;
    
    if (hasInternet) {
      offlineIndicator.classList.remove('show');
      document.body.classList.remove('offline');
      console.log('✅ Online - Full features available');
    } else {
      offlineIndicator.classList.add('show');
      document.body.classList.add('offline');
      console.log('⚠️ Offline - Limited features');
    }
  }

  // Listen for network changes
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  // Initial check after short delay to let page load
  setTimeout(updateOnlineStatus, 2000);
  
  // Periodic checks every 30 seconds to catch network changes
  setInterval(updateOnlineStatus, 30000);
}

// PWA Analytics
function trackPWAUsage(event, data = {}) {
  if (isPWA()) {
    console.log(`PWA Event: ${event}`, data);
    // Add your analytics tracking here
    // Example: gtag('event', event, { ...data, app_mode: 'pwa' });
  }
}

// Export functions for manual use
window.PWAHelper = {
  generateAllIcons,
  generateAndDownloadIcon,
  installPWA,
  updatePWA,
  isPWA,
  trackPWAUsage
};

// Deriv API Configuration
const DERIV_APP_ID = '127799'; // Demo app ID - replace with your app ID
const DERIV_API_URL = `wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`;
const PING_INTERVAL = 30000; // 30 seconds

// State Management
let deriveWS = null;
let currentUser = null;
let userToken = null;
let userAccounts = [];
let requestCounter = 1;
let activeCopies = [];
let pingInterval = null;

// DOM Elements
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loadingModal = document.getElementById('loadingModal');
const errorModal = document.getElementById('errorModal');
const errorMessage = document.getElementById('errorMessage');
const errorCloseBtn = document.getElementById('errorCloseBtn');
const newTradeBtn = document.getElementById('newTradeBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeLoginPage();
    checkExistingSession();
});

// Initialize Login Page
function initializeLoginPage() {
    loginBtn.addEventListener('click', initiateLogin);
    logoutBtn.addEventListener('click', logout);
    errorCloseBtn.addEventListener('click', closeErrorModal);
    newTradeBtn.addEventListener('click', startCopyingTrader);
}

// Parse URL Parameters for Multiple Accounts
function parseAccountsFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const accounts = [];
    
    // Extract all accounts from URL (acct1, token1, cur1, acct2, token2, cur2, etc.)
    let i = 1;
    while (params.has(`acct${i}`)) {
        const account = {
            id: params.get(`acct${i}`),
            token: params.get(`token${i}`),
            currency: params.get(`cur${i}`)
        };
        accounts.push(account);
        i++;
    }
    
    return accounts;
}

// Check for Existing Session
function checkExistingSession() {
    // Check for URL parameters first (from OAuth callback)
    const urlAccounts = parseAccountsFromUrl();
    
    if (urlAccounts.length > 0) {
        userAccounts = urlAccounts;
        // Use the first account by default
        userToken = userAccounts[0].token;
        localStorage.setItem('deriv_token', userToken);
        localStorage.setItem('user_accounts', JSON.stringify(userAccounts));
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        loadDashboard();
    } else {
        // Check localStorage for existing token
        const storedToken = localStorage.getItem('deriv_token');
        const storedAccounts = localStorage.getItem('user_accounts');
        
        if (storedToken && storedAccounts) {
            userToken = storedToken;
            userAccounts = JSON.parse(storedAccounts);
            loadDashboard();
        }
    }
}

// Initiate Deriv Login
function initiateLogin() {
    const redirectUrl = encodeURIComponent(window.location.href);
    const loginUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${DERIV_APP_ID}&redirect_uri=${redirectUrl}`;
    window.location.href = loginUrl;
}

// Handle OAuth Callback
function handleOAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('code');
    
    if (token) {
        userToken = token;
        localStorage.setItem('deriv_token', token);
        // Remove the code from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        loadDashboard();
    }
}

// Load Dashboard
function loadDashboard() {
    showLoading(true);
    
    // Connect to WebSocket
    connectToDerivAPI();
}

// Connect to Deriv WebSocket API
function connectToDerivAPI() {
    deriveWS = new WebSocket(DERIV_API_URL);

    deriveWS.onopen = () => {
        console.log('WebSocket connected');
        // Start ping/pong to keep connection alive
        startPingPong();
        
        // Authorize with token
        const authMessage = {
            authorize: userToken || 'demo_account'
        };
        sendMessage(authMessage);
    };

    deriveWS.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleSocketMessage(data);
    };

    deriveWS.onerror = (error) => {
        console.error('WebSocket error:', error);
        showError('Connection error. Please try again.');
        showLoading(false);
    };

    deriveWS.onclose = () => {
        console.log('WebSocket closed');
        if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
        }
    };
}

// Ping/Pong mechanism to keep connection alive
function startPingPong() {
    if (pingInterval) {
        clearInterval(pingInterval);
    }
    
    pingInterval = setInterval(() => {
        if (deriveWS && deriveWS.readyState === WebSocket.OPEN) {
            sendMessage({ ping: 1 });
        }
    }, PING_INTERVAL);
}

// Send Message to WebSocket
function sendMessage(message) {
    if (deriveWS && deriveWS.readyState === WebSocket.OPEN) {
        message.req_id = requestCounter++;
        deriveWS.send(JSON.stringify(message));
    }
}

// Handle Socket Messages
function handleSocketMessage(data) {
    console.log('Socket message:', data);

    // Handle Authorization
    if (data.authorize) {
        currentUser = data.authorize;
        console.log('User authorized:', currentUser);
        // After authorization, request user settings and balance
        requestUserData();
        showDashboard();
    }

    // Handle Get Settings (for email and name)
    if (data.get_settings) {
        updateUserSettings(data.get_settings);
    }

    // Handle Account Info
    if (data.account_list) {
        updateAccountInfo(data.account_list);
    }

    // Handle Balance
    if (data.balance) {
        updateBalance(data.balance);
        showLoading(false);
    }

    // Handle Portfolio/Positions
    if (data.portfolio) {
        updatePortfolio(data.portfolio);
    }

    // Handle API Token Creation
    if (data.api_token) {
        handleApiTokenResponse(data.api_token);
    }

    // Handle Errors
    if (data.error) {
        // Filter out non-critical errors
        if (data.error.code === 'UnrecognisedRequest') {
            console.warn('Warning: Unrecognised request (non-critical):', data.error.message);
            return; // Don't show error notification for this
        }
        console.error('API Error:', data.error);
        showError(data.error.message);
        showLoading(false);
    }
}

// Request User Data (Settings, Balance, Account Info)
function requestUserData() {
    if (!currentUser) return;

    // Request user settings (to get email and name)
    sendMessage({
        get_settings: 1
    });

    // Request balance with subscription
    sendMessage({
        balance: 1,
        subscribe: 1
    });

    // Request account list
    sendMessage({
        account_list: 1
    });

    // Request portfolio (open positions)
    sendMessage({
        portfolio: 1
    });

    // Load traders data will be called after registration check completes
}

// Update User Settings (Email, Name, Country)
function updateUserSettings(settings) {
    if (!settings) return;

    const email = settings.email || '-';
    const firstName = settings.first_name || '';
    const lastName = settings.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'User';

    // Display user info
    document.getElementById('userName').textContent = fullName;
    document.getElementById('userEmail').textContent = email;
    
    // Display User ID if available
    if (currentUser && currentUser.loginid) {
        document.getElementById('userId').textContent = currentUser.loginid;
    }
    
    // Store in currentUser for later use
    if (currentUser) {
        currentUser.email = email;
        currentUser.fullname = fullName;
    }
    
    console.log('User settings updated:', { email, fullName });
    
    // Check if user is registered
    if (email && email !== '-') {
        checkUserRegistration(email);
    }
}

// Check User Registration Status
function checkUserRegistration(email) {
    const databaseEndpoint = 'https://database.brandyfxtools.site/api/1.1/obj/matchking';
    
    fetch(databaseEndpoint)
        .then(response => response.json())
        .then(data => {
            console.log('Registration check response:', data);
            
            // Check if user email exists AND has a valid token
            let isRegistered = false;
            let userRecord = null;
            
            // The response has a 'results' array within 'response'
            const users = data.response && data.response.results ? data.response.results : [];
            
            if (Array.isArray(users) && users.length > 0) {
                // Search for the user's email in the results array
                userRecord = users.find(user => 
                    user.email && user.email.toLowerCase() === email.toLowerCase()
                );
                
                // User is registered if they have a record with a valid token
                isRegistered = userRecord && userRecord.token && userRecord.token.length > 0;
                
                console.log('Found user record:', userRecord);
            }
            
            // Store registration status
            currentUser.isRegistered = isRegistered;
            
            // Store user registration record if found
            if (userRecord) {
                currentUser.registrationRecord = userRecord;
                console.log('User registration record:', userRecord);
            }
            
            console.log(`User ${email} registration status:`, isRegistered);
            
            if (isRegistered) {
                console.log('User is registered with token - showing full dashboard');
                showSuccessNotification('Welcome back! You are registered.');
            } else {
                console.log('User not yet registered - showing limited features');
                showWarningNotification('You need to complete registration to access all features.');
            }
            
            // Load traders data after registration check is complete
            loadTradersData();
        })
        .catch(error => {
            console.error('Error checking registration:', error);
            // Continue without blocking on registration check error
            currentUser.isRegistered = false;
            loadTradersData();
        });
}

// Disable copy trading for unregistered users
function disableCopyTradingForUnregistered() {
    const copyTraderButtons = document.querySelectorAll('.btn-copy-trader');
    copyTraderButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        btn.title = 'Please complete registration to copy traders';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            showWarningNotification('Please complete your registration first to copy traders.');
        });
    });
}

// Handle API Token Response
function handleApiTokenResponse(apiTokenData) {
    console.log('Full API Token Response:', apiTokenData);
    
    if (!window.pendingCopyTrade) {
        showLoading(false);
        return;
    }

    // Check if token was just created - try to capture from creation response first
    if (apiTokenData.new_token === 1) {
        // Token created successfully
        console.log('Full creation response:', JSON.stringify(apiTokenData, null, 2));
        
        // Check if the unmasked token is in the response
        if (apiTokenData.tokens && apiTokenData.tokens.length > 0) {
            // Find the token that matches the one we just created (by name)
            const pendingTokenName = window.pendingCopyTrade.tokenName;
            let tokenObj = apiTokenData.tokens.find(t => t.display_name === pendingTokenName);
            
            // If not found, get the first one (newly created tokens appear first)
            if (!tokenObj) {
                tokenObj = apiTokenData.tokens[0];
            }
            
            const token = tokenObj.token;
            const tokenName = tokenObj.display_name;
            
            console.log('Token from creation response:', token);
            console.log('Token Length:', token.length);
            console.log('Token is masked:', token.includes('*'));
            
            // Get user email
            const userEmail = currentUser && currentUser.email ? currentUser.email : 
                             (document.getElementById('userEmail').textContent);
            
            console.log('RAW TOKEN OBJECT:', tokenObj);
            
            // The token might be masked in the object, but let's try to access raw WebSocket data
            const tokenValue = String(token);
            console.log('Token Value Length:', tokenValue.length);
            console.log('Raw Token Value:', tokenValue);
            
            // Send token and email to bubble app
            sendToBubbleApp({
                token: tokenValue,
                token_name: tokenName,
                email: userEmail,
                trader: window.pendingCopyTrade.trader.name
            });
            return;
        }
        
        // If token not in creation response, request the list
        console.log('Token not in creation response, requesting list...');
        sendMessage({
            api_token: 1
        });
        return;
    }

    // Get the token from token list response (for follow-up requests)
    if (apiTokenData.tokens && apiTokenData.tokens.length > 0 && !apiTokenData.new_token) {
        // Find the token with the name we just created or get the last one
        const pendingTokenName = window.pendingCopyTrade.tokenName;
        let tokenObj = apiTokenData.tokens.find(t => t.display_name === pendingTokenName);
        
        if (!tokenObj) {
            tokenObj = apiTokenData.tokens[apiTokenData.tokens.length - 1];
        }
        
        const token = tokenObj.token;
        const tokenName = tokenObj.display_name;
        
        console.log('Full token from list:', token);
        
        // Get user email
        const userEmail = currentUser && currentUser.email ? currentUser.email : 
                         (document.getElementById('userEmail').textContent);
        
        // Send token and email to bubble app
        sendToBubbleApp({
            token: token,
            token_name: tokenName,
            email: userEmail,
            trader: window.pendingCopyTrade.trader.name
        });
    }
}

// Send Token and Email to Bubble App
// Update trader button UI immediately
function updateTraderButtonUI(traderName, isRegistered) {
    console.log('updateTraderButtonUI called:', traderName, isRegistered);
    const tradersContainer = document.getElementById('tradersGrid');
    console.log('tradersContainer:', tradersContainer);
    if (!tradersContainer) return;
    
    // Find all trader cards
    const cards = tradersContainer.querySelectorAll('.trader-card');
    console.log('Found trader cards:', cards.length);
    cards.forEach(card => {
        const traderHeader = card.querySelector('h4');
        console.log('Trader header text:', traderHeader ? traderHeader.textContent : 'none');
        if (traderHeader && traderHeader.textContent === traderName) {
            console.log('Found matching trader card');
            const button = card.querySelector('.btn-copy-trader');
            if (button) {
                if (isRegistered) {
                    // Change to "Stop Copying"
                    button.textContent = 'Stop Copying';
                    button.className = 'btn-copy-trader btn-stop-copying';
                    button.disabled = false;
                    button.style.opacity = '1';
                    button.style.cursor = 'pointer';
                    // Clone and replace to update event listeners
                    const newButton = button.cloneNode(true);
                    button.parentNode.replaceChild(newButton, button);
                    newButton.addEventListener('click', () => stopCopying({name: traderName}));
                    console.log('Updated button to Stop Copying');
                } else {
                    // Change to "Start Copying"
                    button.textContent = 'Start Copying';
                    button.className = 'btn-copy-trader';
                    button.disabled = false;
                    button.style.opacity = '1';
                    button.style.cursor = 'pointer';
                    // Clone and replace to update event listeners
                    const newButton = button.cloneNode(true);
                    button.parentNode.replaceChild(newButton, button);
                    newButton.addEventListener('click', () => copyTrader({name: traderName}));
                    console.log('Updated button to Start Copying');
                }
            }
        }
    });
}

function sendToBubbleApp(data) {
    const bubbleEndpoint = 'https://database.brandyfxtools.site/api/1.1/wf/matchking';
    
    // Prepare the full request body
    const requestBody = {
        token_name: data.token_name,
        token: String(data.token),  // Ensure it's a string
        email: data.email,
        trader: data.trader
    };
    
    console.log('Bubble Request prepared');
    console.log('Fields being sent:');
    console.log('- token_name:', requestBody.token_name);
    console.log('- email:', requestBody.email);
    console.log('- trader:', requestBody.trader);
    console.log('- token sent: yes (secure - not logged)');
    
    fetch(bubbleEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    })
    .then(response => response.json())
    .then(responseData => {
        console.log('Bubble App Response:', responseData);
        showLoading(false);
        
        // Add copy to active copies
        activeCopies.push({
            id: Date.now(),
            trader: data.trader,
            instrument: 'Mix',
            amount: 0.00,
            status: 'Active',
            started: new Date().toLocaleDateString()
        });
        updateActiveCopies();
        
        // Update user registration status immediately
        currentUser.isRegistered = true;
        
        // Update button UI immediately
        updateTraderButtonUI(data.trader, true);
        
        // Clear pending copy trade
        window.pendingCopyTrade = null;
        
        // Show success notification
        showSuccessNotification(`Successfully started copying ${data.trader}!`);
    })
    .catch(error => {
        console.error('Error sending to Bubble App:', error);
        showLoading(false);
        showError(`Failed to initialize copy trading: ${error.message}`);
        window.pendingCopyTrade = null;
    });
}

// Update Account Info
function updateAccountInfo(accounts) {
    if (accounts && accounts.length > 0) {
        const account = accounts[0];
        const balance = parseFloat(account.balance) || 0;
        const currency = account.currency || 'USD';
        
        document.getElementById('accountBalance').textContent = `${balance.toFixed(2)}`;
        document.getElementById('accountCurrency').textContent = currency;
        
        console.log('Account info updated:', { balance, currency });
    }
}

// Update Balance
function updateBalance(balanceData) {
    if (balanceData && balanceData.balance) {
        const balance = parseFloat(balanceData.balance);
        const currency = balanceData.currency || 'USD';
        
        document.getElementById('accountBalance').textContent = `${balance.toFixed(2)}`;
        document.getElementById('accountCurrency').textContent = currency;
        
        console.log('Balance updated:', { balance, currency });
    }
}

// Update Portfolio
function updatePortfolio(portfolio) {
    if (portfolio && portfolio.portfolio) {
        const positions = portfolio.portfolio;
        if (positions.length === 0) {
            document.getElementById('copiesTableBody').innerHTML = '<tr><td colspan="6" class="no-data">No active copies yet</td></tr>';
        }
    }
}

// Load Traders Data (Mock Data for Demo)
function loadTradersData() {
    const tradersGrid = document.getElementById('tradersGrid');
    
    // Mock trader data
    const traders = [
        {
            id: 1,
            name: 'Deriv Pro',
            winRate: 97,
            followers: 98,
            avgProfit: '$2,500',
            riskLevel: 'Low'
        }
    ];

    tradersGrid.innerHTML = '';
    traders.forEach(trader => {
        const card = createTraderCard(trader);
        tradersGrid.appendChild(card);
    });
}

// Create Trader Card
function createTraderCard(trader) {
    const card = document.createElement('div');
    card.className = 'trader-card';
    
    // Check if user is registered
    const isRegistered = currentUser && currentUser.isRegistered;
    const buttonText = isRegistered ? 'Stop Copying' : 'Start Copying';
    const buttonClass = isRegistered ? 'btn-copy-trader btn-stop-copying' : 'btn-copy-trader';
    
    card.innerHTML = `
        <div class="trader-avatar">
            <div class="avatar-placeholder">${trader.name.charAt(0)}</div>
        </div>
        <div class="trader-info">
            <h4>${trader.name}</h4>
            <div class="trader-stats">
                <div class="stat">
                    <span class="stat-label">Win Rate:</span>
                    <span class="stat-value">${trader.winRate}%</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Followers:</span>
                    <span class="stat-value">${trader.followers}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Avg Profit:</span>
                    <span class="stat-value">${trader.avgProfit}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Risk Level:</span>
                    <span class="stat-value risk-${trader.riskLevel.toLowerCase()}">${trader.riskLevel}</span>
                </div>
            </div>
            <button class="${buttonClass}" data-trader-id="${trader.id}">${buttonText}</button>
        </div>
    `;

    const copyBtn = card.querySelector('.btn-copy-trader');
    
    if (isRegistered) {
        // For registered users: "Stop Copying" button
        copyBtn.addEventListener('click', () => stopCopying(trader));
    } else {
        // For unregistered users: "Start Copying" button - initiate registration
        copyBtn.addEventListener('click', () => copyTrader(trader));
    }

    return card;
}

// Stop Copying Trader
function stopCopying(trader) {
    if (confirm(`Are you sure you want to stop copying ${trader.name}?`)) {
        const email = currentUser && currentUser.email;
        
        if (!email) {
            showWarningNotification('Unable to stop copying - email not found');
            return;
        }
        
        showLoading(true);
        
        // Fetch current user data from database to get latest token info
        const databaseEndpoint = 'https://database.brandyfxtools.site/api/1.1/obj/matchking';
        
        fetch(databaseEndpoint)
            .then(response => response.json())
            .then(data => {
                console.log('Fetched user data for stop copying:', data);
                
                // Find user by email
                const users = data.response && data.response.results ? data.response.results : [];
                const userRecord = users.find(user => 
                    user.email && user.email.toLowerCase() === email.toLowerCase()
                );
                
                if (!userRecord || !userRecord.token) {
                    showLoading(false);
                    showWarningNotification('Token information not found');
                    return;
                }
                
                const tokenToDelete = userRecord.token;
                // Use token_name if available, otherwise use name field
                const tokenName = userRecord.token_name || userRecord.name;
                
                console.log('Token to delete:', tokenToDelete);
                console.log('Token name:', tokenName);
                console.log('User record:', userRecord);
                
                // Delete token from Deriv via WebSocket
                sendMessage({
                    api_token: 1,
                    delete_token: tokenToDelete
                });
                
                // Then send delete request to Bubble after a short delay
                setTimeout(() => {
                    const deleteTokenEndpoint = 'https://database.brandyfxtools.site/api/1.1/wf/delete token';
                    
                    fetch(deleteTokenEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            email: email,
                            token_name: tokenName
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log('Delete token response from Bubble:', data);
                        showLoading(false);
                        
                        // Consider it successful if we got a response (Bubble doesn't error)
                        // or if explicitly marked as success
                        const isSuccess = data && (data.status === 'SUCCESS' || !data.error || data.error === null);
                        
                        if (isSuccess) {
                            showSuccessNotification(`Successfully stopped copying ${trader.name}`);
                            // Update UI to reflect stopped copying immediately
                            currentUser.isRegistered = false;
                            updateTraderButtonUI(trader.name, false);
                        } else {
                            showWarningNotification(data.message || 'Failed to stop copying');
                        }
                    })
                    .catch(error => {
                        console.error('Error stopping copying:', error);
                        showLoading(false);
                        showWarningNotification('Error stopping copy - please try again');
                    });
                }, 500);
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
                showLoading(false);
                showWarningNotification('Error fetching user information - please try again');
            });
    }
}

// Copy Trader
function copyTrader(trader) {
    // Create API token for copy trading
    createCopyTradingToken(trader);
}

// Create API Token for Copy Trading
function createCopyTradingToken(trader) {
    // Token name: alphanumeric with space and dash only, 2-32 characters
    const timestamp = Date.now().toString().slice(-6); // Use last 6 digits
    const tokenName = `Copy ${trader.name} ${timestamp}`.substring(0, 32);
    
    showLoading(true);
    
    // Store pending copy trade BEFORE making request
    window.pendingCopyTrade = {
        trader: trader,
        tokenName: tokenName,
        createdAt: Date.now()
    };
    
    // Request to create API token via websocket
    // After creation, the token is returned unmasked in the response
    sendMessage({
        api_token: 1,
        new_token: tokenName,
        new_token_scopes: ['trade', 'trading_information', 'read']
    });
}

// Start Copying Trader
function startCopyingTrader() {
    alert('Select a trader from the "Top Traders" section to start copying');
}

// Update Active Copies Table
function updateActiveCopies() {
    const tbody = document.getElementById('copiesTableBody');
    
    if (activeCopies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No active copies yet</td></tr>';
        return;
    }

    tbody.innerHTML = activeCopies.map(copy => `
        <tr>
            <td>${copy.trader}</td>
            <td>${copy.instrument}</td>
            <td>$${copy.amount.toFixed(2)}</td>
            <td><span class="status-badge status-active">${copy.status}</span></td>
            <td>${copy.started}</td>
            <td>
                <button class="btn-action btn-stop" data-copy-id="${copy.id}">Stop</button>
            </td>
        </tr>
    `).join('');

    // Add event listeners to stop buttons
    document.querySelectorAll('.btn-stop').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const copyId = e.target.dataset.copyId;
            removeCopy(copyId);
        });
    });
}

// Remove Copy
function removeCopy(copyId) {
    activeCopies = activeCopies.filter(c => c.id !== parseInt(copyId));
    updateActiveCopies();
    alert('Copy stopped successfully');
}

// Show Dashboard
function showDashboard() {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
}

// Show Login
function showLogin() {
    loginSection.style.display = 'flex';
    dashboardSection.style.display = 'none';
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('deriv_token');
        localStorage.removeItem('user_accounts');
        userToken = null;
        userAccounts = [];
        currentUser = null;
        activeCopies = [];
        
        if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
        }
        
        if (deriveWS) {
            deriveWS.close();
        }

        showLogin();
    }
}

// Show/Hide Loading Modal
function showLoading(show) {
    loadingModal.style.display = show ? 'flex' : 'none';
}

// Show Error Modal
function showError(message) {
    errorMessage.textContent = message;
    errorModal.style.display = 'flex';
}

// Close Error Modal
function closeErrorModal() {
    errorModal.style.display = 'none';
}

// Show Success Notification
function showSuccessNotification(message) {
    // Create success notification element
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">✓</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Show Warning Notification
function showWarningNotification(message) {
    // Create warning notification element
    const notification = document.createElement('div');
    notification.className = 'warning-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">⚠</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Monitor for OAuth callback
if (window.location.search.includes('acct')) {
    // URL contains account parameters, reload to process them
    checkExistingSession();
} else if (window.location.search.includes('code=')) {
    handleOAuthCallback();
}

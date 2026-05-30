// ═══════════════════════════════════════════════════════════════════════════
// MatchKing Premium Terminal Integration Layer - DigitPro Unified Edition
// ═══════════════════════════════════════════════════════════════════════════

let derivWs;
let marketsData = {};         
let activeMarkets = ["R_100", "R_75", "R_50", "R_25", "R_10",  "1HZ10V", "1HZ15V", "1HZ30V", "1HZ50V", "1HZ75V", "1HZ90V", "1HZ100V"];
let tickCount = 100;          
let totalProcessedTicks = 0;  
let predictionTimer = null;   
let countdownSeconds = 0;     
let currentPrediction = null;
let cooldownTimer = null;      // 60-second gap between predictions

// Simple tracking state derived from unified login system
let isAuthenticated = false;
let currentUser = { hasAccess: true }; // Grants default premium state for validated tokens

// ── Prediction countdown (37s display lock) ───────────────────────────────
function startPredictionCountdown() {
    if (predictionTimer) clearInterval(predictionTimer);

    countdownSeconds = 45;
    updateCountdownDisplay();

    predictionTimer = setInterval(() => {
        countdownSeconds--;
        updateCountdownDisplay();

        if (countdownSeconds <= 0) {
            clearInterval(predictionTimer);
            predictionTimer = null;
            currentPrediction = null;

            // Show "calculating" message and start 60-second cooldown
            const container = document.getElementById('prediction-highlights');
            if (container) {
                container.innerHTML = '<div class="no-predictions">⏳ Recalculating… next signal in 20s</div>';
            }
            const cdEl = document.getElementById('prediction-countdown');
            if (cdEl) cdEl.style.display = 'none';

            startCooldown();
        }
    }, 1000);
}

function startCooldown() {
    if (cooldownTimer) clearInterval(cooldownTimer);
    let cooldownSeconds = 20;

    cooldownTimer = setInterval(() => {
        cooldownSeconds--;
        const container = document.getElementById('prediction-highlights');
        if (container && container.querySelector('.no-predictions')) {
            container.querySelector('.no-predictions').textContent =
                `⏳ Recalculating… next signal in ${cooldownSeconds}s`;
        }

        if (cooldownSeconds <= 0) {
            clearInterval(cooldownTimer);
            cooldownTimer = null;
            // Allow a fresh prediction to be calculated
        }
    }, 1000);
}

function updateCountdownDisplay() {
    const el = document.getElementById('prediction-countdown');
    if (el) {
        if (countdownSeconds > 0) {
            el.textContent = `⏰ ${countdownSeconds}s`;
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
    }
}

// Guard check executes as soon as DOM loads
document.addEventListener('DOMContentLoaded', () => {
    checkTerminalAccess();
});

/**
 * DigitPro Unified Access Control Guard
 */


/**
 * DigitPro Unified Access Control Guard
 */
function checkTerminalAccess() {
    const token = sessionStorage.getItem('mk_auth_token');
    const userEmail = sessionStorage.getItem('mk_user_email');

    // 1. ALWAYS DO THE SECURITY CHECK FIRST
    // If session tokens do not exist from the login portal, redirect immediately
    if (!token || !userEmail) {
        console.warn('⛔ Unauthorized session context detected. Redirecting to login portal...');
        clearLocalSession();
        window.location.href = '/login.html'; 
        return;
    }

    // 2. NOW THAT ACCESS IS VALIDATED, RUN UI UPDATES SAFELY
    // Define the welcome heading element properly to prevent crashes
    const welcomeHeading = document.getElementById('welcome-text');
    if (welcomeHeading && userEmail) {
        // Splits "alex@gmail.com" at the '@' and turns "alex" into "ALEX"
        const standardName = userEmail.split('@')[0].toUpperCase(); 
        // Changes "Loading workspace..." to "Welcome Back, ALEX!"
        welcomeHeading.textContent = `Welcome Back, ${standardName}!`;
    }

    // Fire the personalized welcome popup overlay window
    showWelcomeModal(userEmail);
    
    // Auth validation matches token state
    isAuthenticated = true;

    // Display user identity inside the platform sidebar layout
    const nameDisplay = document.getElementById('user-name-sidebar');
    if (nameDisplay) {
        nameDisplay.textContent = userEmail.split('@')[0].toUpperCase();
        nameDisplay.title = userEmail;
    }

    // Hide or remove secure protection overlay screen guard to reveal interface
    const guardOverlay = document.getElementById('auth-guard-overlay');
    if (guardOverlay) {
        guardOverlay.style.opacity = '0';
        setTimeout(() => guardOverlay.remove(), 300);
    }
    
    console.log(`🚀 Access authorized for DigitPro account: ${userEmail}`);
    
    // Proceed to boot data processing streams
    initializeTerminal();
}

// ═══════════════════════════════════════════════════════════════════════════
// WELCOME MODAL INTERACTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function showWelcomeModal(userEmail) {
    const welcomeModal = document.getElementById('welcome-modal');
    const modalHeading = document.getElementById('modal-welcome-text');
    
    if (modalHeading && userEmail) {
        const standardName = userEmail.split('@')[0].toUpperCase();
        modalHeading.textContent = `WELCOME BACK, ${standardName}!`;
    }

    if (welcomeModal) {
        welcomeModal.style.display = 'flex';
        // Force reflow to ensure CSS transitions trigger correctly
        void welcomeModal.offsetWidth;
        welcomeModal.style.opacity = '1';
        welcomeModal.style.visibility = 'visible';
    }
}

function hideWelcomeModal() {
    const welcomeModal = document.getElementById('welcome-modal');
    if (welcomeModal) {
        welcomeModal.style.opacity = '0';
        welcomeModal.style.visibility = 'hidden';
        setTimeout(() => {
            welcomeModal.style.display = 'none';
        }, 300);
    }
}
/**
 * Clean session variables on disconnect or explicit user logout
 */
function clearLocalSession() {
   sessionStorage.removeItem('mk_auth_token');
    sessionStorage.removeItem('mk_user_email');
    sessionStorage.removeItem('mk_device_fp');
    sessionStorage.removeItem('mk_login_time');
    isAuthenticated = false;
    if (predictionTimer) { clearInterval(predictionTimer); predictionTimer = null; }
    if (cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null; }
}

/**
 * Manual Portal Logout Action
 */
function logout() {
    clearLocalSession();
    window.location.href = '/login.html';
}

/**
 * Primary system terminal activation
 */
function initializeTerminal() {
    initializeMarketData();
    startWebSocket(); // Connects directly via public pipeline

    // Layout response controls
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeSidebarOnMobile();
        });
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.remove('active');
        }
    });
}

// Market asset string labels
const marketNames = {
    "R_100": "Volatility 100", "R_75": "Volatility 75", "R_50": "Volatility 50",
    "R_25": "Volatility 25", "R_10": "Volatility 10", "1HZ10V": "Volatility 10(1s)", "1HZ15V": "volatility 15(1s)", "1HZ30V": "volatility 30(1s)", "1HZ50V": "Volatility 50(1s)", "1HZ75V": "Volatility 75(1s)", "1HZ90V": "Volatility 90(1s)", "1HZ100V": "Volatility 100(1s)",
};

function getMarketName(symbol) { return marketNames[symbol] || symbol; }

function initializeMarketData() {
    activeMarkets.forEach(symbol => {
        marketsData[symbol] = {
            tickHistory: [], decimalPlaces: 2, processedTicks: 0, lastPrice: null, digitCounts: new Array(10).fill(0)
        };
    });
}

/**
 * Establishes WebSockets connection using Public Non-OAuth channels
 * (Allows streaming structural ticks without Deriv individual user account tokens)
 */
function startWebSocket() {
    // Prevent stream access if local guard flags are invalid
    if (!isAuthenticated) {
        console.warn('⚠️ Cannot start stream processing without a valid local login session.');
        return false;
    }

    if (derivWs) {
        try {
            derivWs.close();
        } catch (e) {
            console.warn('⚠️ Closing existing pipeline channel connection:', e);
        }
    }

    initializeMarketData();
    totalProcessedTicks = 0;
    updateTickCounter();

    // Direct access to public infrastructure stream 
    const wsEndpoint = 'wss://ws.derivws.com/websockets/v3?app_id=1089';
    
    try {
        derivWs = new WebSocket(wsEndpoint);
        console.log(`🔗 Initializing real-time public data feed pipeline: ${wsEndpoint}`);
    } catch (error) {
        console.error('❌ Failed to construct WebSocket stream target instance:', error);
        return false;
    }

    derivWs.onopen = function () {
        console.log(`✅ Pipeline successfully locked onto feed data for ${activeMarkets.length} markets.`);
        updateConnectionStatus(true);
        
        // Request historical background feed ticks array matching selected parameters
        activeMarkets.forEach(symbol => {
            requestTickHistory(symbol);
        });
    };

    derivWs.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);

            if (data.error) {
                console.error('❌ Data pipeline interface notice:', data.error);
                return;
            }

            if (data.history) {
                const symbol = data.echo_req.ticks_history;
                marketsData[symbol].tickHistory = data.history.prices.map((price, index) => ({
                    time: data.history.times[index],
                    quote: parseFloat(price)
                }));

                detectDecimalPlaces(symbol);
                analyzeMarket(symbol);
                updateAllDisplays();
            }

            if (data.tick) {
                const symbol = data.tick.symbol;
                let tickQuote = parseFloat(data.tick.quote);
                
                if (marketsData[symbol]) {
                    marketsData[symbol].tickHistory.push({ 
                        time: data.tick.epoch, 
                        quote: tickQuote 
                    });

                    if (marketsData[symbol].tickHistory.length > tickCount) {
                        marketsData[symbol].tickHistory.shift();
                    }

                    analyzeMarket(symbol);
                    updateAllDisplays();
                    
                    totalProcessedTicks++;
                    updateTickCounter();

                    // Bubble.io Application Integrations
                    let lastDigit = getLastDigit(tickQuote, marketsData[symbol].decimalPlaces);
                    let isEven = lastDigit % 2 === 0 ? 1 : 0;
                    let isOdd = lastDigit % 2 !== 0 ? 1 : 0;

                    if (typeof window.bubble_fn_wsEvent1 === "function") {
                        window.bubble_fn_wsEvent1(lastDigit);
                    }
                    if (typeof window.bubble_fn_price1 === "function") {
                        window.bubble_fn_price1(tickQuote.toFixed(marketsData[symbol].decimalPlaces));
                    }
                    if (typeof window.bubble_fn_even === "function") {
                        window.bubble_fn_even(isEven);
                    }
                    if (typeof window.bubble_fn_odd === "function") {
                        window.bubble_fn_odd(isOdd);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error handling downstream data packet:', error);
        }
    };

    derivWs.onerror = function (error) {
        console.error("❌ WebSocket Stream Anomaly Error:", error);
        updateConnectionStatus(false);
        setTimeout(startWebSocket, 3000); // Re-establish connectivity pipelines
    };

    derivWs.onclose = function () {
        console.warn("⚠️ WebSocket Data Pipeline Connection Dropped");
        updateConnectionStatus(false);
        if (isAuthenticated) {
            setTimeout(startWebSocket, 5000);
        }
    };
    
    return true;
}

function requestTickHistory(symbol) {
    if (derivWs && derivWs.readyState === WebSocket.OPEN) {
        const request = {
            ticks_history: symbol,
            count: tickCount,
            end: "latest",
            style: "ticks",
            subscribe: 1
        };
        derivWs.send(JSON.stringify(request));
    }
}

function detectDecimalPlaces(symbol) {
    const market = marketsData[symbol];
    let decimalCounts = market.tickHistory.map(tick => {
        let decimalPart = tick.quote.toString().split(".")[1] || "";
        return decimalPart.length;
    });
    market.decimalPlaces = Math.max(...decimalCounts, 2);
}

function getLastDigit(price, decimalPlaces = 2) {
    let priceStr = price.toString();
    let priceParts = priceStr.split(".");
    let decimals = priceParts[1] || "";
    while (decimals.length < decimalPlaces) { decimals += "0"; }
    return Number(decimals.slice(-1));
}

function analyzeMarket(symbol) {
    const market = marketsData[symbol];
    if (market.tickHistory.length === 0) return;
    market.digitCounts.fill(0);
    market.tickHistory.forEach(tick => {
        let lastDigit = getLastDigit(tick.quote, market.decimalPlaces);
        market.digitCounts[lastDigit]++;
    });
}

function updateAllDisplays() {
    updateMarketsList();
    updateAggregatedPrice();
    updatePredictionHighlights();
    updateEvenOddPredictions();
}

function updateConnectionStatus(connected) {
    const statusBadge = document.getElementById('connection-badge');
    if (statusBadge) {
        statusBadge.textContent = connected ? '● Connected' : '● Offline';
        statusBadge.style.color = connected ? '#289D3F' : '#C0392B';
    }
    const sidebarStatus = document.getElementById('connection-status-sidebar');
    if (sidebarStatus) {
        sidebarStatus.textContent = connected ? 'Connected' : 'Offline';
    }
}

function updateTickCounter() {
    const counter = document.getElementById('tick-counter');
    if (counter) counter.textContent = totalProcessedTicks;
}

function updateMarketsList() {
    const marketsElement = document.getElementById('active-markets');
    if (marketsElement) {
        const activeCount = Object.keys(marketsData).filter(symbol => 
            marketsData[symbol].tickHistory.length > 0
        ).length;
        marketsElement.textContent = `${activeCount}/${activeMarkets.length} markets active`;
    }
}

function updateAggregatedPrice() {
    let latestPrice = null, latestSymbol = null, latestTime = 0;
    
    Object.keys(marketsData).forEach(symbol => {
        const market = marketsData[symbol];
        if (market.tickHistory.length > 0) {
            const lastTick = market.tickHistory[market.tickHistory.length - 1];
            if (lastTick.time > latestTime) {
                latestTime = lastTick.time;
                latestPrice = lastTick.quote;
                latestSymbol = symbol;
            }
        }
    });
    
    if (latestPrice !== null && marketsData[latestSymbol]) {
        const priceElement = document.getElementById('current-price');
        const symbolElement = document.getElementById('current-symbol');
        if (priceElement) priceElement.textContent = latestPrice.toFixed(marketsData[latestSymbol].decimalPlaces);
        if (symbolElement) symbolElement.textContent = latestSymbol;
        
        const lastDigitElement = document.getElementById('last-digit');
        if (lastDigitElement) {
            const priceString = latestPrice.toFixed(marketsData[latestSymbol].decimalPlaces);
            lastDigitElement.textContent = priceString.slice(-1);
        }
    }
}

/**
 * Process Statistical Digit Pattern Matches
 * ─ Full port of script1.js algorithm ─
 * • Threshold: 18.2% (same as script1)
 * • Requires ALL markets to have full tick data before any prediction
 * • Shows exactly which market(s) are driving the signal with their names
 * • 37-second display lock → 60-second cooldown → next prediction cycle
 */
function updatePredictionHighlights() {
    const threshold = 18.2;
    const requiredTicks = tickCount;
    const predictions = [];
    const container = document.getElementById('prediction-highlights');

    // ── Gate 1: block while 37s display timer is running ─────────────────
    if (predictionTimer !== null) {
        console.log('⏳ Timer active – keeping current prediction displayed');
        return;
    }

    // ── Gate 2: block during 60-second cooldown between predictions ───────
    if (cooldownTimer !== null) {
        return;
    }

    // ── Gate 3: wait until ALL markets have the full required tick data ───
    const marketsWithFullData = Object.keys(marketsData).filter(symbol =>
        marketsData[symbol].tickHistory.length >= requiredTicks
    );
    const totalActiveMarkets = Object.keys(marketsData).length;

    if (marketsWithFullData.length === 0) {
        if (container) container.innerHTML = `<div class="no-predictions">Fetching historical data (${requiredTicks} ticks per market)...</div>`;
        return;
    } else if (marketsWithFullData.length < totalActiveMarkets) {
        if (container) container.innerHTML = `<div class="no-predictions">Loading: ${marketsWithFullData.length}/${totalActiveMarkets} markets ready with ${requiredTicks} ticks...</div>`;
        return;
    }

    console.log(`📊 Analysis ready: All ${totalActiveMarkets} markets have ${requiredTicks} ticks for accurate predictions`);

    // ── Core algorithm — exact script1 logic ─────────────────────────────
    for (let digit = 0; digit <= 9; digit++) {
        let digitMarkets = [];
        let totalCount = 0;
        let totalTicks = 0;

        marketsWithFullData.forEach(symbol => {
            const market = marketsData[symbol];
            const marketDigitCount = market.digitCounts[digit];
            const marketTotalTicks = market.tickHistory.length;
            const marketPercentage = (marketDigitCount / marketTotalTicks) * 100;

            if (marketPercentage >= threshold) {
                digitMarkets.push({
                    symbol: symbol,
                    percentage: marketPercentage.toFixed(2),
                    count: marketDigitCount,
                    total: marketTotalTicks
                });
            }
            totalCount += marketDigitCount;
            totalTicks += marketTotalTicks;
        });

        const overallPercentage = totalTicks > 0 ? (totalCount / totalTicks) * 100 : 0;

        if (overallPercentage >= threshold || digitMarkets.length > 0) {
            console.log(`🎯 Digit ${digit}: Overall ${overallPercentage.toFixed(2)}%, Markets above threshold: ${digitMarkets.length}`);
            predictions.push({
                digit: digit,
                overallPercentage: overallPercentage.toFixed(2),
                markets: digitMarkets,
                totalCount: totalCount,
                totalTicks: totalTicks
            });
        }
    }

    // Sort by highest overall percentage, show single top prediction
    predictions.sort((a, b) => parseFloat(b.overallPercentage) - parseFloat(a.overallPercentage));
    const topPredictions = predictions.length > 0 ? [predictions[0]] : [];

    if (!container) return;

    if (topPredictions.length === 0) {
        container.innerHTML = '<div class="no-predictions">No repeating patterns detected yet...</div>';
        currentPrediction = null;
    } else {
        const pred = topPredictions[0];
        const predictionKey = `${pred.digit}-${pred.overallPercentage}`;

        const hasIndividualHighs = pred.markets.length > 0;
        const statusIcon = hasIndividualHighs ? '🔥' : '📈';

        // Build market tags — full readable market name + percentage
        const marketTags = pred.markets.map(m =>
            `<span class="prediction-market-tag">${getMarketName(m.symbol)} (${m.percentage}%)</span>`
        ).join('');

        container.innerHTML = `
            <div class="prediction-item">
                <div class="prediction-digit">${statusIcon} ${pred.digit}</div>
                <div id="prediction-countdown" class="prediction-countdown">⏰ 45s</div>
                
                <div class="prediction-markets">
                    ${hasIndividualHighs
                        ? `<strong>Market:</strong><br>${marketTags}`
                        : `<strong>Overall Average</strong><br>Across all markets`
                    }
                </div>
            </div>`;

        currentPrediction = predictionKey;
        startPredictionCountdown();
        console.log(`🎯 New prediction: Digit ${pred.digit}  – 45s display then 30s cooldown`);
    }

    console.log(`🎯 Prediction scan: ${predictions.length} digits above ${threshold}%, showing top ${topPredictions.length}`);

    if (typeof window.bubble_fn_predictions === "function") {
        const predictionData = topPredictions.map(p => ({
            digit: p.digit,
            percentage: p.overallPercentage,
            markets: p.markets.length
        }));
        window.bubble_fn_predictions(JSON.stringify(predictionData));
    }
}

/**
 * Even/Odd Metric Evaluation Systems
 */


// User Action Interface Callbacks
window.updateSymbol = function (newSymbol) {
    if (newSymbol === 'ALL') {
        activeMarkets = ["R_100", "R_75", "R_50", "R_25", "R_10", "RDBEAR", "RDBULL", "1HZ10V", "1HZ15V", "1HZ30V", "1HZ50V", "1HZ75V", "1HZ90V", "1HZ100V"];
    } else {
        activeMarkets = [newSymbol];
    }
    initializeMarketData();
    if (isAuthenticated) startWebSocket();
};

window.updateTickCount = function (newTickCount) {
    tickCount = newTickCount;
    if (isAuthenticated) startWebSocket();
};
// ═══════════════════════════════════════════════════════════════════════════
// REFRESH & EXIT SECURITY GUARD (FORCES LOGIN ON RELOAD OR NAVIGATING AWAY)
// ═══════════════════════════════════════════════════════════════════════════

window.addEventListener('beforeunload', () => {
    // This runs the instant the page is refreshed or left
    sessionStorage.removeItem('mk_auth_token');
    sessionStorage.removeItem('mk_user_email');
    sessionStorage.removeItem('mk_login_time');
    
    // Safely close the active live feed if it exists
    if (typeof derivWs !== 'undefined' && derivWs.readyState === WebSocket.OPEN) {
        derivWs.close();
    }
});
// Function to extract email name and present modal structure smoothly
function showWelcomeModal(userEmail) {
    const welcomeModal = document.getElementById('welcome-modal');
    const modalHeading = document.getElementById('modal-welcome-text');
    
    // Extract name pattern (e.g., "john" from "john@domain.com")
    if (modalHeading && userEmail) {
        const standardName = userEmail.split('@')[0].toUpperCase();
        modalHeading.textContent = `WELCOME BACK, ${standardName}!`;
    }

    if (welcomeModal) {
        welcomeModal.style.display = 'flex';
        // Force reflow to ensure transition is applied
        void welcomeModal.offsetWidth;
        welcomeModal.style.opacity = '1';
        welcomeModal.style.visibility = 'visible';
    }
}

// Hide welcome modal smoothly
function hideWelcomeModal() {
    const welcomeModal = document.getElementById('welcome-modal');
    if (welcomeModal) {
        welcomeModal.style.opacity = '0';
        welcomeModal.style.visibility = 'hidden';
        setTimeout(() => {
            welcomeModal.style.display = 'none';
        }, 300);
    }
}
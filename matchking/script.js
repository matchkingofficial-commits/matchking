let derivWs;
let marketsData = {};         // Store data for all markets
let activeMarkets = ["R_100", "R_75", "R_50", "R_25", "R_10", "RDBEAR", "RDBULL", "1HZ10V", "1HZ15V", "1HZ30V", "1HZ50V", "1HZ75V", "1HZ90V", "1HZ100V"];
let tickCount = 120;          // Default tick count
let totalProcessedTicks = 0;  // Total counter for all ticks
let predictionTimer = null;   // Countdown timer
let countdownSeconds = 0;     // Current countdown value
let currentPrediction = null; // Track current prediction digit
let isAuthenticated = false;  // Authentication state flag

// =============== SIDEBAR FUNCTIONALITY ===============
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

function closeSidebarOnMobile() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth <= 768) {
        sidebar.classList.remove('active');
    }
}

// Close sidebar when clicking on navigation links
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            closeSidebarOnMobile();
        });
    });

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.remove('active');
            }
        }
    });
});

// Market names mapping
const marketNames = {
    "R_100": "Volatility 100",
    "R_75": "Volatility 75",
    "R_50": "Volatility 50",
    "R_25": "Volatility 25",
    "R_10": "Volatility 10",
    "1HZ10V": "1s Volatility 10",
    "1HZ15V": "1s Volatility 15",
    "1HZ30V": "1s Volatility 30",
    "1HZ50V": "1s Volatility 50",
    "1HZ75V": "1s Volatility 75",
    "1HZ90V": "1s Volatility 90",
    "1HZ100V": "1s Volatility 100"
};

// Helper function to get market name
function getMarketName(symbol) {
    return marketNames[symbol] || symbol;
}

// Helper function to get display name (replace specific name with Admin)
function getDisplayName(userName) {
    console.log('🔍 getDisplayName called with:', userName);
    if (userName === 'Wallace Peter Karanja Guthera') {
        console.log('✅ Name replacement: Wallace Peter Karanja Guthera -> Admin');
        return 'Admin';
    }
    console.log('ℹ️ No replacement needed for:', userName);
    return userName;
}

// Function to clear all stored authentication data
function clearStoredAuthData() {
    localStorage.removeItem('derivlite_user');
    localStorage.removeItem('derivlite_token');
    localStorage.removeItem('derivlite_auth_time');
    console.log('🗑️ Cleared all stored authentication data');
}

// Initialize market data structure
function initializeMarketData() {
    activeMarkets.forEach(symbol => {
        marketsData[symbol] = {
            tickHistory: [],
            decimalPlaces: 2,
            processedTicks: 0,
            lastPrice: null,
            digitCounts: new Array(10).fill(0)
        };
    });
}

// Countdown timer functions
function startPredictionCountdown() {
    // Clear existing timer
    if (predictionTimer) {
        clearInterval(predictionTimer);
    }
    
    countdownSeconds = 45;
    updateCountdownDisplay();
    
    predictionTimer = setInterval(() => {
        countdownSeconds--;
        updateCountdownDisplay();
        
        if (countdownSeconds <= 0) {
            clearInterval(predictionTimer);
            predictionTimer = null;
            currentPrediction = null; // Clear current prediction when timer expires
            
            // Clear the prediction display when timer expires
            const container = document.getElementById('prediction-highlights');
            if (container) {
                container.innerHTML = '<div class="no-predictions">No repeating patterns detected yet...</div>';
            }
            
            console.log('🕐 Countdown expired - Prediction cleared, ready for new predictions');
        }
    }, 1000);
}

function updateCountdownDisplay() {
    const countdownElement = document.getElementById('prediction-countdown');
    if (countdownElement) {
        if (countdownSeconds > 0) {
            countdownElement.textContent = `⏰ ${countdownSeconds}s`;
            countdownElement.style.display = 'block';
        } else {
            countdownElement.style.display = 'none';
        }
    }
}

// UI Update Functions
function updateConnectionStatus(connected) {
    // Update main status element (in top bar)
    const statusBadge = document.getElementById('connection-badge');
    if (statusBadge) {
        statusBadge.textContent = connected ? '● Connected' : '● Offline';
        statusBadge.style.color = connected ? '#4caf50' : '#ff6a6a';
    }
    
    // Update sidebar status element
    const sidebarStatus = document.getElementById('connection-status-sidebar');
    if (sidebarStatus) {
        sidebarStatus.textContent = connected ? 'Connected' : 'Offline';
        sidebarStatus.className = connected ? 'status-connected' : 'status-disconnected';
    }
    
    // Update body class for styling
    if (connected) {
        document.body.classList.remove('offline');
        document.body.classList.add('online');
    } else {
        document.body.classList.remove('online');
        document.body.classList.add('offline');
    }
}

function updateAggregatedPrice() {
    // Display the most recent price from any market
    let latestPrice = null;
    let latestSymbol = null;
    let latestTime = 0;
    
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
    
    if (latestPrice !== null) {
        const priceElement = document.getElementById('current-price');
        const lastDigitElement = document.getElementById('last-digit');
        const symbolElement = document.getElementById('current-symbol');
        
        if (priceElement) {
            priceElement.textContent = latestPrice.toFixed(marketsData[latestSymbol].decimalPlaces);
            priceElement.style.animation = 'pulse 0.5s ease-in-out';
            setTimeout(() => {
                priceElement.style.animation = '';
            }, 500);
        }
        
        if (lastDigitElement) {
            const lastDigit = getLastDigit(latestPrice, marketsData[latestSymbol].decimalPlaces);
            lastDigitElement.textContent = `Last Digit: ${lastDigit}`;
            lastDigitElement.className = `last-digit digit-${lastDigit}`;
        }
        
        if (symbolElement) {
            symbolElement.textContent = latestSymbol;
        }
    }
}

function updateDigitPercentages() {
    // Aggregate digit counts from all markets
    let aggregatedDigitCounts = new Array(10).fill(0);
    let totalTicks = 0;
    
    Object.values(marketsData).forEach(market => {
        market.digitCounts.forEach((count, digit) => {
            aggregatedDigitCounts[digit] += count;
        });
        totalTicks += market.tickHistory.length;
    });
    
    if (totalTicks === 0) return;
    
    const digitPercentages = aggregatedDigitCounts.map(count => ((count / totalTicks) * 100).toFixed(2));
    
    digitPercentages.forEach((percentage, digit) => {
        const percentageElement = document.getElementById(`digit-${digit}`);
        const barElement = document.getElementById(`bar-${digit}`);
        
        if (percentageElement) {
            percentageElement.textContent = `${percentage}%`;
        }
        
        if (barElement) {
            barElement.style.width = `${percentage}%`;
            barElement.style.backgroundColor = getDigitColor(digit);
        }
    });
    
    // Update extremes
    let highestDigit = digitPercentages.indexOf(Math.max(...digitPercentages.map(p => parseFloat(p))).toFixed(2));
    let lowestDigit = digitPercentages.indexOf(Math.min(...digitPercentages.map(p => parseFloat(p))).toFixed(2));
    
    updateExtremes(highestDigit, lowestDigit);
    
    // Bubble.io integration for aggregated data
    digitPercentages.forEach((percentage, digit) => {
        if (typeof window[`bubble_fn_${digit}`] === "function") {
            window[`bubble_fn_${digit}`](parseFloat(percentage));
        }
    });
    
    if (typeof window.bubble_fn_highest === "function") {
        window.bubble_fn_highest(highestDigit);
    }
    
    if (typeof window.bubble_fn_lowest === "function") {
        window.bubble_fn_lowest(lowestDigit);
    }
}

function updateExtremes(highest, lowest) {
    const highestElement = document.getElementById('highest-digit');
    const lowestElement = document.getElementById('lowest-digit');
    
    if (highestElement) {
        highestElement.textContent = highest;
        highestElement.className = `extreme-value digit-${highest}`;
    }
    if (lowestElement) {
        lowestElement.textContent = lowest;
        lowestElement.className = `extreme-value digit-${lowest}`;
    }
}

function updateLast50Digits() {
    // Get last 50 digits from all markets combined, sorted by timestamp
    let allRecentTicks = [];
    
    Object.keys(marketsData).forEach(symbol => {
        const market = marketsData[symbol];
        market.tickHistory.forEach(tick => {
            allRecentTicks.push({
                time: tick.time,
                quote: tick.quote,
                symbol: symbol,
                decimalPlaces: market.decimalPlaces
            });
        });
    });
    
    // Sort by timestamp and take last 50
    allRecentTicks.sort((a, b) => a.time - b.time);
    const last50Ticks = allRecentTicks.slice(-50);
    
    const last50Digits = last50Ticks.map(tick => getLastDigit(tick.quote, tick.decimalPlaces));
    const digitsString = last50Digits.join(',');
    
    const container = document.getElementById('last-50-digits');
    if (container) {
        container.innerHTML = last50Digits.map((digit, index) => {
            const tick = last50Ticks[index];
            return `<span class="digit-chip digit-${digit}" title="${tick.symbol}: ${tick.quote.toFixed(tick.decimalPlaces)}">${digit}</span>`;
        }).join('');
    }
    
    // Bubble.io integration
    if (typeof window.bubble_fn_last50 === "function") {
        window.bubble_fn_last50(digitsString);
    }
    
    console.log("✅ Last 50 Digits (All Markets):", digitsString);
}

function updateTickCounter() {
    const counter = document.getElementById('tick-counter');
    if (counter) {
        counter.textContent = totalProcessedTicks;
    }
}

function updatePredictionHighlights() {
    // Find digits above threshold and their markets
    const threshold = 18.2;
    const requiredTicks = tickCount; // Require exactly the full tick count for accurate analysis
    const predictions = [];
    
    // Check if we have exactly the required number of ticks for each market
    const marketsWithFullData = Object.keys(marketsData).filter(symbol => 
        marketsData[symbol].tickHistory.length >= requiredTicks
    );
    
    const totalActiveMarkets = Object.keys(marketsData).length;
    
    if (marketsWithFullData.length === 0) {
        const container = document.getElementById('prediction-highlights');
        if (container) {
            container.innerHTML = '<div class="no-predictions">Fetching historical data (120 ticks per market)...</div>';
        }
        return;
    } else if (marketsWithFullData.length < totalActiveMarkets) {
        const container = document.getElementById('prediction-highlights');
        if (container) {
            container.innerHTML = `<div class="no-predictions">Loading: ${marketsWithFullData.length}/${totalActiveMarkets} markets ready with ${requiredTicks} ticks...</div>`;
        }
        return;
    }
    
    console.log(`📊 Analysis ready: All ${totalActiveMarkets} markets have ${requiredTicks} ticks for accurate predictions`);
    
    // Check each digit (0-9)
    for (let digit = 0; digit <= 9; digit++) {
        let digitMarkets = [];
        let totalCount = 0;
        let totalTicks = 0;
        
        // Check each market for this digit (only markets with full data)
        marketsWithFullData.forEach(symbol => {
            const market = marketsData[symbol];
            const marketDigitCount = market.digitCounts[digit];
            const marketTotalTicks = market.tickHistory.length;
            const marketPercentage = ((marketDigitCount / marketTotalTicks) * 100);
            
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
        
        // Calculate overall percentage for this digit
        const overallPercentage = totalTicks > 0 ? ((totalCount / totalTicks) * 100) : 0;
        
        // Debug logging
        if (overallPercentage >= threshold || digitMarkets.length > 0) {
            console.log(`🎯 Digit ${digit}: Overall ${overallPercentage.toFixed(2)}%, Markets above threshold: ${digitMarkets.length}`);
        }
        
        // If overall percentage is above threshold OR any individual market is above threshold
        if (overallPercentage >= threshold || digitMarkets.length > 0) {
            predictions.push({
                digit: digit,
                overallPercentage: overallPercentage.toFixed(2),
                markets: digitMarkets,
                totalCount: totalCount,
                totalTicks: totalTicks
            });
        }
    }
    
    // Sort by overall percentage (highest first)
    predictions.sort((a, b) => parseFloat(b.overallPercentage) - parseFloat(a.overallPercentage));
    
    // Only show the first (highest) prediction
    const topPredictions = predictions.length > 0 ? [predictions[0]] : [];
    
    // Update the UI
    const container = document.getElementById('prediction-highlights');
    if (container) {
        // If there's an active timer, don't update the display - keep current prediction
        if (predictionTimer !== null) {
            console.log('⏳ Timer active - keeping current prediction displayed');
            return; // Don't update anything while timer is running
        }
        
        // Only update when no timer is running
        if (topPredictions.length === 0) {
            container.innerHTML = '<div class="no-predictions">No repeating patterns detected yet...</div>';
            currentPrediction = null;
        } else {
            // Show new prediction and start timer
            const newPrediction = topPredictions[0];
            const predictionKey = `${newPrediction.digit}-${newPrediction.overallPercentage}`;
            
            container.innerHTML = topPredictions.map(pred => {
            const marketTags = pred.markets.map(market => 
                `<span class="prediction-market-tag">${getMarketName(market.symbol)}</span>`
            ).join('');
            
            const hasIndividualHighs = pred.markets.length > 0;
            const statusIcon = hasIndividualHighs ? '👑' : '📈';
            
            return `
                <div class="prediction-item">
                    <div class="prediction-digit">${statusIcon} ${pred.digit}</div>
                    <div id="prediction-countdown" class="prediction-countdown">⏰ 37s</div>
                    <div class="prediction-markets">
                        ${hasIndividualHighs ? 
                            `<strong></strong><br>${marketTags}` : 
                            `<strong>Overall Average</strong><br>Across all markets`
                        }
                    </div>
                </div>
            `;
            }).join('');
            
            // Start countdown for new prediction
            currentPrediction = predictionKey;
            startPredictionCountdown();
            console.log(`🎯 New prediction detected: Digit ${newPrediction.digit} (${newPrediction.overallPercentage}%) - Starting 45s countdown`);
        }
    }
    
    console.log(`🎯 Prediction Highlights: ${predictions.length} digits above ${threshold}%, showing top ${topPredictions.length}`);
    
    // Bubble.io integration for predictions (send only the top prediction)
    if (typeof window.bubble_fn_predictions === "function") {
        const predictionData = topPredictions.map(p => ({
            digit: p.digit,
            percentage: p.overallPercentage,
            markets: p.markets.length
        }));
        window.bubble_fn_predictions(JSON.stringify(predictionData));
    }
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

function getDigitColor(digit) {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[digit] || '#666';
}

// Function to start WebSocket connection
function startWebSocket() {
    // Check authentication before starting analysis
    if (!isAuthenticated) {
        console.warn('⚠️ Cannot start analysis without authentication');
        lockDashboard();
        return false;
    }
    // Ensure user has paid access before starting
    if (!currentUser || !currentUser.hasAccess) {
        console.warn('🚫 Cannot start analysis - user has not paid or access not granted');
        // Lock UI and prompt payment
        lockDashboard();
        showPaymentModal();
        return false;
    }

    if (derivWs) {
        try {
            derivWs.close();
        } catch (e) {
            console.warn('⚠️ Error closing previous WebSocket:', e);
        }
    }

    // Initialize market data
    initializeMarketData();
    updateConnectionStatus(false);
    totalProcessedTicks = 0;
    updateTickCounter();

    // Try with the official Deriv API endpoint with better error handling
    const wsEndpoint = 'wss://ws.derivws.com/websockets/v3?app_id=1089';
    
    try {
        derivWs = new WebSocket(wsEndpoint);
        console.log(`🔗 Attempting WebSocket connection to: ${wsEndpoint}`);
    } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        showNotification('WebSocket connection failed. Please refresh the page.', 'error');
        return false;
    }

    derivWs.onopen = function () {
        console.log(`✅ Connected to Deriv API for ${activeMarkets.length} markets`);
        updateConnectionStatus(true);
       
        
        // Request exactly tickCount (120) historical ticks for all markets
        activeMarkets.forEach(symbol => {
            console.log(`📡 Requesting ${tickCount} historical ticks for ${symbol}`);
            try {
                requestTickHistory(symbol);
            } catch (error) {
                console.error(`❌ Error requesting ${symbol}:`, error);
            }
        });
    };

    derivWs.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);

            if (data.error) {
                console.error('❌ API Error:', data.error);
                showNotification('API Error: ' + data.error.message, 'error');
                return;
            }

            if (data.history) {
                const symbol = data.echo_req.ticks_history;
                const receivedCount = data.history.prices.length;
                console.log(`📊 ${symbol}: Loaded ${receivedCount}/${tickCount} historical ticks`);
                
                marketsData[symbol].tickHistory = data.history.prices.map((price, index) => ({
                    time: data.history.times[index],
                    quote: parseFloat(price)
                }));

                detectDecimalPlaces(symbol);
                analyzeMarket(symbol);
                
                // Update aggregated displays
                updateAllDisplays();
            }

            if (data.tick) {
                const symbol = data.tick.symbol;
                let tickQuote = parseFloat(data.tick.quote);
                
                if (marketsData[symbol]) {
                    console.log(`🔄 New Tick ${symbol}: ${tickQuote.toFixed(marketsData[symbol].decimalPlaces)}`);

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

                    // Bubble.io integration for latest tick
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
            console.error('❌ Error processing WebSocket message:', error);
        }
    };

    derivWs.onerror = function (error) {
        console.error("❌ WebSocket Error:", error);
        updateConnectionStatus(false);
        showNotification('Connection error. Attempting to reconnect...', 'warning');
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            startWebSocket();
        }, 3000);
    };

    derivWs.onclose = function () {
        console.warn("⚠️ WebSocket Disconnected");
        updateConnectionStatus(false);
        
        // Attempt to reconnect after 5 seconds
        if (isAuthenticated) {
            console.log('🔄 Reconnecting in 5 seconds...');
            setTimeout(() => {
                startWebSocket();
            }, 5000);
        }
    };
    
    return true;
}

// Function to request tick history for a specific symbol
function requestTickHistory(symbol) {
    const request = {
        ticks_history: symbol,
        count: tickCount,
        end: "latest",
        style: "ticks",
        subscribe: 1
    };
    derivWs.send(JSON.stringify(request));
}

// Function to detect the number of decimal places dynamically for a market
function detectDecimalPlaces(symbol) {
    const market = marketsData[symbol];
    let decimalCounts = market.tickHistory.map(tick => {
        let decimalPart = tick.quote.toString().split(".")[1] || "";
        return decimalPart.length;
    });

    market.decimalPlaces = Math.max(...decimalCounts, 2);
    console.log(`🔍 Detected Decimal Places for ${symbol}: ${market.decimalPlaces}`);
}

// Function to extract the last digit
function getLastDigit(price, decimalPlaces = 2) {
    let priceStr = price.toString();
    let priceParts = priceStr.split(".");
    let decimals = priceParts[1] || "";

    while (decimals.length < decimalPlaces) {
        decimals += "0";
    }

    return Number(decimals.slice(-1));
}

// Function to analyze a specific market
function analyzeMarket(symbol) {
    const market = marketsData[symbol];
    if (market.tickHistory.length === 0) return;

    // Reset counts
    market.digitCounts.fill(0);

    // Analyze digits
    market.tickHistory.forEach(tick => {
        let lastDigit = getLastDigit(tick.quote, market.decimalPlaces);
        market.digitCounts[lastDigit]++;
    });

    console.log(`✅ Analyzed ${symbol}: ${market.tickHistory.length} ticks`);
}

// Function to update all displays with aggregated data
function updateAllDisplays() {
    updateMarketsList();
    updatePredictionHighlights();
    updateEvenOddPredictions();
}

// Even/Odd Prediction System
function updateEvenOddPredictions() {
    const container = document.getElementById('even-odd-predictions');
    if (!container) return;
    
    const evenDigits = [0, 2, 4, 6, 8];
    const oddDigits = [1, 3, 5, 7, 9];
    const requiredTicks = tickCount;
    const confidenceThreshold = 55; // Minimum confidence to show prediction
    
    // Always show all activeMarkets, even if no signal
    const predictions = activeMarkets.map(symbol => {
        const market = marketsData[symbol];
        const totalTicks = market.tickHistory.length;
        if (totalTicks < requiredTicks) {
            return {
                symbol,
                marketName: getMarketName(symbol),
                prediction: null,
                signalStrength: 'neutral',
                loading: true
            };
        }
        // Count even and odd occurrences
        let evenCount = 0;
        let oddCount = 0;
        evenDigits.forEach(digit => { evenCount += market.digitCounts[digit]; });
        oddDigits.forEach(digit => { oddCount += market.digitCounts[digit]; });
        const evenPercentage = (evenCount / totalTicks) * 100;
        const oddPercentage = (oddCount / totalTicks) * 100;
        const prediction = evenPercentage > oddPercentage ? 'EVEN' : 'ODD';
        const difference = Math.abs(evenPercentage - oddPercentage);
        let signalStrength = 'weak';
        if (difference >= 10) signalStrength = 'strong';
        else if (difference >= 5) signalStrength = 'medium';
        if (difference < 3) signalStrength = 'neutral';
        return {
            symbol,
            marketName: getMarketName(symbol),
            prediction: signalStrength === 'neutral' ? null : prediction,
            signalStrength,
            loading: false
        };
    });

    container.innerHTML = predictions.map(pred => {
        if (pred.loading) {
            return `<div class="even-odd-card neutral"><div class="eo-market"><span class="eo-market-name">${pred.marketName}</span></div><div class="eo-prediction"><span class="eo-badge neutral">Loading...</span></div></div>`;
        } else if (!pred.prediction) {
            return `<div class="even-odd-card neutral"><div class="eo-market"><span class="eo-market-name">${pred.marketName}</span></div><div class="eo-prediction"><span class="eo-badge neutral">No Signal</span></div></div>`;
        } else {
            const predictionClass = pred.prediction === 'EVEN' ? 'even' : 'odd';
            const strengthClass = `strength-${pred.signalStrength}`;
            return `<div class="even-odd-card ${predictionClass} ${strengthClass}"><div class="eo-market"><span class="eo-market-name">${pred.marketName}</span></div><div class="eo-prediction"><span class="eo-badge ${predictionClass}">${pred.prediction}</span></div><div class="eo-signal ${strengthClass}"><i class="fas fa-signal"></i> ${pred.signalStrength.toUpperCase()} SIGNAL</div></div>`;
        }
    }).join('');

    // Bubble.io integration
    if (typeof window.bubble_fn_evenOddPredictions === "function") {
        window.bubble_fn_evenOddPredictions(JSON.stringify(predictions));
    }

    console.log(`🎲 Even/Odd Predictions updated: ${predictions.length} markets analyzed`);
}

// Function to update symbol (now updates which markets to analyze)
window.updateSymbol = function (newSymbol) {
    console.log(`🔄 Updating to analyze: ${newSymbol}`);
    if (newSymbol === 'ALL') {
        activeMarkets = ["R_100", "R_75", "R_50", "R_25", "R_10", "RDBEAR", "RDBULL", "1HZ10V", "1HZ15V", "1HZ30V", "1HZ50V", "1HZ75V", "1HZ90V", "1HZ100V"];
    } else {
        activeMarkets = [newSymbol];
    }
    // If authenticated and WebSocket is open, just request new tick history for the selected market(s)
    if (isAuthenticated && derivWs && derivWs.readyState === WebSocket.OPEN) {
        activeMarkets.forEach(symbol => {
            try {
                requestTickHistory(symbol);
            } catch (error) {
                console.error(`❌ Error requesting tick history for ${symbol}:`, error);
            }
        });
    }
};

// Function to update tick count
window.updateTickCount = function (newTickCount) {
    console.log(`🔄 Updating tick count to: ${newTickCount}`);
    tickCount = newTickCount;
    // If authenticated and WebSocket is open, just request new tick history for all markets
    if (isAuthenticated && derivWs && derivWs.readyState === WebSocket.OPEN) {
        activeMarkets.forEach(symbol => {
            try {
                requestTickHistory(symbol);
            } catch (error) {
                console.error(`❌ Error requesting tick history for ${symbol}:`, error);
            }
        });
    }
};

// Start WebSocket on page load
document.addEventListener('DOMContentLoaded', function() {
    // Clear any stored authentication data to ensure fresh login
    clearStoredAuthData();
    
    // Don't auto-start WebSocket - wait for authentication
    // startWebSocket(); // Moved to after authentication
    
    // Add some visual feedback for controls
    const symbolSelect = document.getElementById('symbol-select');
    const tickCountSelect = document.getElementById('tick-count');
    
    if (symbolSelect) {
        symbolSelect.addEventListener('change', function() {
            this.style.animation = 'pulse 0.3s ease-in-out';
            setTimeout(() => {
                this.style.animation = '';
            }, 300);
        });
    }
    
    if (tickCountSelect) {
        tickCountSelect.addEventListener('change', function() {
            this.style.animation = 'pulse 0.3s ease-in-out';
            setTimeout(() => {
                this.style.animation = '';
            }, 300);
        });
    }
});

// Deriv OAuth Configuration

// Deriv API Configuration
const DERIV_WS_URL = 'wss://ws.derivws.com/websockets/v3?app_id=90470';
const API_TOKEN = 'tGNBkuzzO6lmo7r';

// State
let ws = null;
let currentIndex = 'R_100'; // Default: Volatility 100 Index
let tickHistory = [];
const maxTicks = 100;
let eoSequence = [];

// Map UI index names to Deriv API symbols
const indexMap = {
    'V100': 'R_100',
    'V10': 'R_10',
    'V10s': '1HZ10V',
    'V24': 'R_24',
    'V24s': '1HZ24V',
    'V75': 'R_75',
    'V75s': '1HZ75V',
    'V100s': '1HZ100V',
    'V150': 'R_150',
    'V150s': '1HZ150V'
};

// DOM Elements
const volatilitySelect = document.getElementById('volatilitySelect');
const priceTick = document.getElementById('priceTick');
const digitsPanel = document.getElementById('digitsPanel');
const updownPanel = document.getElementById('updownPanel');
const tradeButtons = document.querySelectorAll('.trade-btn');
const digitGrid = document.querySelectorAll('.digit');
const eoSequenceDiv = document.getElementById('eoSequence');
const eoSelect = document.getElementById('eoSelect');
const ouDigitSelect = document.getElementById('ouDigitSelect');
const ouTypeSelect = document.getElementById('ouTypeSelect');
const mdDigitSelect = document.getElementById('mdDigitSelect');
const eoPrediction = document.getElementById('eoPrediction');
const ouPrediction = document.getElementById('ouPrediction');
const mdPrediction = document.getElementById('mdPrediction');
const mdTimer = document.getElementById('mdTimer');
const expertInsights = document.getElementById('expertInsights');
const modeToggle = document.getElementById('modeToggle');

// Dark/Light Mode Toggle
modeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light');
    modeToggle.textContent = document.body.classList.contains('light') ? '🌞 Light' : '🌙 Dark';
});

// Trade Type Switching
tradeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        tradeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        digitsPanel.classList.toggle('hidden', btn.dataset.type !== 'digits');
        updownPanel.classList.toggle('hidden', btn.dataset.type !== 'updown');
    });
});

// Volatility Index Switching
volatilitySelect.addEventListener('change', () => {
    currentIndex = indexMap[volatilitySelect.value];
    subscribeToTicks(currentIndex);
});

// Initialize WebSocket Connection
function initWebSocket() {
    ws = new WebSocket(DERIV_WS_URL);

    ws.onopen = () => {
        console.log('WebSocket connected');
        // Authorize with API token
        ws.send(JSON.stringify({
            authorize: API_TOKEN
        }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.error) {
            console.error('API Error:', data.error.message);
            return;
        }
        if (data.msg_type === 'authorize') {
            // Subscribe to active symbols to verify available indices
            ws.send(JSON.stringify({
                active_symbols: 'brief',
                product_type: 'basic'
            }));
        } else if (data.msg_type === 'active_symbols') {
            // Subscribe to default index
            subscribeToTicks(currentIndex);
        } else if (data.msg_type === 'tick') {
            updateTick(data.tick);
        }
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected. Reconnecting...');
        setTimeout(initWebSocket, 5000); // Reconnect after 5 seconds
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

// Subscribe to Tick Stream
function subscribeToTicks(symbol) {
    // Unsubscribe from previous tick stream
    ws.send(JSON.stringify({
        forget_all: 'ticks'
    }));
    // Subscribe to new tick stream
    ws.send(JSON.stringify({
        ticks: symbol,
        subscribe: 1
    }));
}

// AI Prediction Logic
function analyzeEvenOdd() {
    const choice = eoSelect.value;
    const evenDigits = tickHistory.filter(d => [0, 2, 4, 6, 8].includes(d)).length;
    const percentage = (evenDigits / tickHistory.length * 100).toFixed(1);
    const streak = detectStreak(tickHistory, d => [0, 2, 4, 6, 8].includes(d));
    const duration = Math.min(10, Math.floor(Math.random() * 5 + 5));
    eoPrediction.textContent = `Trade ${choice.charAt(0).toUpperCase() + choice.slice(1)} for up to ${duration} runs (${percentage}% ${choice})`;
}

function analyzeOverUnder() {
    const digit = parseInt(ouDigitSelect.value);
    const type = ouTypeSelect.value;
    const count = tickHistory.filter(d => (type === 'over' ? d > digit : d < digit)).length;
    const percentage = (count / tickHistory.length * 100).toFixed(1);
    const duration = Math.min(10, Math.floor(Math.random() * 5 + 5));
    const color = type === 'over' ? 'blue' : 'red';
    ouPrediction.textContent = `Trade ${type.charAt(0).toUpperCase() + type.slice(1)} ${digit} (${type.charAt(0).toUpperCase()}, ${color}) for up to ${duration} runs (${percentage}%)`;
}

function analyzeMatchesDiffers() {
    const digit = parseInt(mdDigitSelect.value);
    const count = tickHistory.filter(d => d === digit).length;
    const percentage = (count / tickHistory.length * 100).toFixed(1);
    mdPrediction.textContent = `Match ${digit} in 10 seconds (${percentage}%)`;
    startTimer(10, digit);
}

function analyzeUpDown() {
    const priceChanges = tickHistory.slice(1).map((d, i) => tickHistory[i] < d ? 'up' : 'down');
    const upCount = priceChanges.filter(c => c === 'up').length;
    const percentage = (upCount / priceChanges.length * 100).toFixed(1);
    const direction = percentage > 50 ? 'Rise' : 'Fall';
    const duration = Math.min(15, Math.floor(Math.random() * 5 + 10));
    udPrediction.textContent = `Trade ${direction} for up to ${duration} seconds (${percentage}% ${direction.toLowerCase()})`;
}

// Timer for Matches/Differs
function startTimer(seconds, digit) {
    let time = seconds;
    mdTimer.textContent = `Time: ${time}s`;
    const interval = setInterval(() => {
        time--;
        mdTimer.textContent = `Time: ${time}s`;
        if (time <= 0) {
            clearInterval(interval);
            const lastDigit = tickHistory[tickHistory.length - 1];
            mdTimer.textContent = lastDigit === digit ? 'Won' : 'Lost';
        }
    }, 1000);
}

// Pattern Recognition
function detectStreak(history, condition) {
    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
        if (condition(history[i])) streak++;
        else break;
    }
    return streak;
}

// Update Tick and UI
function updateTick(tick) {
    priceTick.textContent = `Price: ${tick.quote}`;

    // Extract last digit
    const lastDigit = parseInt(tick.quote.toString().slice(-1));
    tickHistory.push(lastDigit);
    if (tickHistory.length > maxTicks) tickHistory.shift();

    // Update digit grid
    digitGrid.forEach(d => {
        const digit = parseInt(d.dataset.digit);
        const count = tickHistory.filter(h => h === digit).length;
        d.querySelector('span').textContent = `${(count / tickHistory.length * 100).toFixed(1)}%`;
        d.classList.toggle('active', digit === lastDigit);
    });

    // Update Even/Odd sequence
    const isEven = [0, 2, 4, 6, 8].includes(lastDigit);
    eoSequence.push(isEven ? 'E' : 'O');
    if (eoSequence.length > 8) eoSequence.shift();
    eoSequenceDiv.innerHTML = eoSequence.map(e => 
        `<span class="eo-indicator ${e === 'E' ? 'even' : 'odd'}">${e}</span>`
    ).join('');

    // Update expert insights
    const streak = detectStreak(tickHistory, d => [0, 2, 4, 6, 8].includes(d));
    expertInsights.textContent = `Recent streak: ${streak} Even digits`;
}

// Analyze Button Listeners
document.querySelectorAll('.analyze-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        setTimeout(() => {
            if (btn.dataset.type === 'eo') analyzeEvenOdd();
            else if (btn.dataset.type === 'ou') analyzeOverUnder();
            else if (btn.dataset.type === 'md') analyzeMatchesDiffers();
            else if (btn.dataset.type === 'ud') analyzeUpDown();
        }, 2000); // 2-second delay for AI processing
    });
});

// Initialize WebSocket
initWebSocket();const mdDigitSelect = document.getElementById('mdDigitSelect');
const eoPrediction = document.getElementById('eoPrediction');
const ouPrediction = document.getElementById('ouPrediction');
const mdPrediction = document.getElementById('mdPrediction');
const mdTimer = document.getElementById('mdTimer');
const expertInsights = document.getElementById('expertInsights');
const modeToggle = document.getElementById('modeToggle');

// Dark/Light Mode Toggle
modeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light');
    modeToggle.textContent = document.body.classList.contains('light') ? '🌞 Light' : '🌙 Dark';
});

// Trade Type Switching
tradeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        tradeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        digitsPanel.classList.toggle('hidden', btn.dataset.type !== 'digits');
        updownPanel.classList.toggle('hidden', btn.dataset.type !== 'updown');
    });
});

// Volatility Index Switching
volatilitySelect.addEventListener('change', () => {
    currentIndex = indexMap[volatilitySelect.value];
    subscribeToTicks(currentIndex);
});

// Initialize WebSocket Connection
function initWebSocket() {
    ws = new WebSocket(DERIV_WS_URL);

    ws.onopen = () => {
        console.log('WebSocket connected');
        // Authorize with API token
        ws.send(JSON.stringify({
            authorize: API_TOKEN
        }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.error) {
            console.error('API Error:', data.error.message);
            return;
        }
        if (data.msg_type === 'authorize') {
            // Subscribe to active symbols to verify available indices
            ws.send(JSON.stringify({
                active_symbols: 'brief',
                product_type: 'basic'
            }));
        } else if (data.msg_type === 'active_symbols') {
            // Subscribe to default index
            subscribeToTicks(currentIndex);
        } else if (data.msg_type === 'tick') {
            updateTick(data.tick);
        }
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected. Reconnecting...');
        setTimeout(initWebSocket, 5000); // Reconnect after 5 seconds
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

// Subscribe to Tick Stream
function subscribeToTicks(symbol) {
    // Unsubscribe from previous tick stream
    ws.send(JSON.stringify({
        forget_all: 'ticks'
    }));
    // Subscribe to new tick stream
    ws.send(JSON.stringify({
        ticks: symbol,
        subscribe: 1
    }));
}

// AI Prediction Logic
function analyzeEvenOdd() {
    const choice = eoSelect.value;
    const evenDigits = tickHistory.filter(d => [0, 2, 4, 6, 8].includes(d)).length;
    const percentage = (evenDigits / tickHistory.length * 100).toFixed(1);
    const streak = detectStreak(tickHistory, d => [0, 2, 4, 6, 8].includes(d));
    const duration = Math.min(10, Math.floor(Math.random() * 5 + 5));
    eoPrediction.textContent = `Trade ${choice.charAt(0).toUpperCase() + choice.slice(1)} for up to ${duration} runs (${percentage}% ${choice})`;
}

function analyzeOverUnder() {
    const digit = parseInt(ouDigitSelect.value);
    const type = ouTypeSelect.value;
    const count = tickHistory.filter(d => (type === 'over' ? d > digit : d < digit)).length;
    const percentage = (count / tickHistory.length * 100).toFixed(1);
    const duration = Math.min(10, Math.floor(Math.random() * 5 + 5));
    const color = type === 'over' ? 'blue' : 'red';
    ouPrediction.textContent = `Trade ${type.charAt(0).toUpperCase() + type.slice(1)} ${digit} (${type.charAt(0).toUpperCase()}, ${color}) for up to ${duration} runs (${percentage}%)`;
}

function analyzeMatchesDiffers() {
    const digit = parseInt(mdDigitSelect.value);
    const count = tickHistory.filter(d => d === digit).length;
    const percentage = (count / tickHistory.length * 100).toFixed(1);
    mdPrediction.textContent = `Match ${digit} in 10 seconds (${percentage}%)`;
    startTimer(10, digit);
}

function analyzeUpDown() {
    const priceChanges = tickHistory.slice(1).map((d, i) => tickHistory[i] < d ? 'up' : 'down');
    const upCount = priceChanges.filter(c => c === 'up').length;
    const percentage = (upCount / priceChanges.length * 100).toFixed(1);
    const direction = percentage > 50 ? 'Rise' : 'Fall';
    const duration = Math.min(15, Math.floor(Math.random() * 5 + 10));
    udPrediction.textContent = `Trade ${direction} for up to ${duration} seconds (${percentage}% ${direction.toLowerCase()})`;
}

// Timer for Matches/Differs
function startTimer(seconds, digit) {
    let time = seconds;
    mdTimer.textContent = `Time: ${time}s`;
    const interval = setInterval(() => {
        time--;
        mdTimer.textContent = `Time: ${time}s`;
        if (time <= 0) {
            clearInterval(interval);
            const lastDigit = tickHistory[tickHistory.length - 1];
            mdTimer.textContent = lastDigit === digit ? 'Won' : 'Lost';
        }
    }, 1000);
}

// Pattern Recognition
function detectStreak(history, condition) {
    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
        if (condition(history[i])) streak++;
        else break;
    }
    return streak;
}

// Update Tick and UI
function updateTick(tick) {
    priceTick.textContent = `Price: ${tick.quote}`;

    // Extract last digit
    const lastDigit = parseInt(tick.quote.toString().slice(-1));
    tickHistory.push(lastDigit);
    if (tickHistory.length > maxTicks) tickHistory.shift();

    // Update digit grid
    digitGrid.forEach(d => {
        const digit = parseInt(d.dataset.digit);
        const count = tickHistory.filter(h => h === digit).length;
        d.querySelector('span').textContent = `${(count / tickHistory.length * 100).toFixed(1)}%`;
        d.classList.toggle('active', digit === lastDigit);
    });

    // Update Even/Odd sequence
    const isEven = [0, 2, 4, 6, 8].includes(lastDigit);
    eoSequence.push(isEven ? 'E' : 'O');
    if (eoSequence.length > 8) eoSequence.shift();
    eoSequenceDiv.innerHTML = eoSequence.map(e => 
        `<span class="eo-indicator ${e === 'E' ? 'even' : 'odd'}">${e}</span>`
    ).join('');

    // Update expert insights
    const streak = detectStreak(tickHistory, d => [0, 2, 4, 6, 8].includes(d));
    expertInsights.textContent = `Recent streak: ${streak} Even digits`;
}

// Analyze Button Listeners
document.querySelectorAll('.analyze-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        setTimeout(() => {
            if (btn.dataset.type === 'eo') analyzeEvenOdd();
            else if (btn.dataset.type === 'ou') analyzeOverUnder();
            else if (btn.dataset.type === 'md') analyzeMatchesDiffers();
            else if (btn.dataset.type === 'ud') analyzeUpDown();
        }, 2000); // 2-second delay for AI processing
    });
});

// Initialize WebSocket
initWebSocket();

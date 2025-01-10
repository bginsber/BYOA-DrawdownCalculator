// Get DOM elements
const initialInvestmentInput = document.getElementById('initial-investment');
const lossPercentageInput = document.getElementById('loss-percentage');
const dollarLossInput = document.getElementById('dollar-loss-input');
const requiredGainElement = document.getElementById('required-gain');
const chartContainer = document.getElementById('chart-container');
const visualizeBtn = document.getElementById('visualize-btn');
const modeToggle = document.getElementById('mode-toggle');
const firstInputLabel = document.getElementById('first-input-label');
const secondInputLabel = document.getElementById('second-input-label');
let recoveryChart = null;

// Calculate required gain percentage
function calculateRequiredGain(lossPercentage) {
    if (lossPercentage >= 100) return Infinity;
    const gain = (1 / (1 - lossPercentage / 100)) - 1;
    return gain * 100;
}

// Update calculations
function updateCalculations(sourceInput) {
    const firstValue = initialInvestmentInput.value ? parseFloat(initialInvestmentInput.value) : '';
    let lossPercentage = 0;
    let dollarLoss = 0;

    if (sourceInput === 'percentage') {
        lossPercentage = parseFloat(lossPercentageInput.value) || 0;
        if (isATHMode) {
            dollarLoss = firstValue * (lossPercentage / 100);
            dollarLossInput.value = (firstValue - dollarLoss).toFixed(2);
        } else {
            dollarLoss = firstValue * (lossPercentage / 100);
            dollarLossInput.value = dollarLoss.toFixed(2);
        }
    } else if (sourceInput === 'dollar') {
        if (isATHMode) {
            const currentPrice = parseFloat(dollarLossInput.value) || 0;
            dollarLoss = firstValue - currentPrice;
            lossPercentage = (dollarLoss / firstValue) * 100;
        } else {
            dollarLoss = parseFloat(dollarLossInput.value) || 0;
            lossPercentage = (dollarLoss / firstValue) * 100;
        }
        lossPercentageInput.value = lossPercentage.toFixed(2);
    }

    // Calculate required gain percentage
    const requiredGainPercentage = calculateRequiredGain(lossPercentage);
    requiredGainElement.textContent = 
        isFinite(requiredGainPercentage) 
            ? `${requiredGainPercentage.toFixed(2)}%` 
            : 'Infinite';

    // Update chart only if it's visible
    if (chartContainer.style.display !== 'none') {
        createRecoveryChart();
    }
}

// Replace toggle event listener with button listeners
const breakevenBtn = document.getElementById('breakeven-btn');
const athBtn = document.getElementById('ath-btn');
let isATHMode = false;

function updateButtonStates() {
    breakevenBtn.classList.toggle('active', !isATHMode);
    athBtn.classList.toggle('active', isATHMode);
}

function switchMode(mode) {
    isATHMode = mode === 'ath';
    updateButtonStates();
    
    if (isATHMode) {
        // ATH Mode
        firstInputLabel.textContent = 'All-Time High ($)';
        secondInputLabel.textContent = 'Current Price ($)';
        lossPercentageInput.placeholder = 'Enter drawdown %';
    } else {
        // Initial Investment Mode
        firstInputLabel.textContent = 'Initial Investment ($)';
        secondInputLabel.textContent = 'Dollar Loss ($)';
        lossPercentageInput.placeholder = 'Enter 0-99.99';
    }
    updateCalculations('dollar');
}

breakevenBtn.addEventListener('click', () => switchMode('breakeven'));
athBtn.addEventListener('click', () => switchMode('ath'));

// Create recovery chart
function createRecoveryChart() {
    const currentLoss = parseFloat(lossPercentageInput.value) || 0;
    const currentGain = calculateRequiredGain(currentLoss);
    
    // Determine the max range for the chart
    const maxLoss = Math.max(90, Math.ceil(currentLoss));
    
    // Generate data points
    const losses = [];
    const gains = [];
    for (let loss = 0; loss <= maxLoss; loss += 1) {
        losses.push(loss);
        gains.push(calculateRequiredGain(loss));
    }
    
    // Make sure we include the exact current loss point
    if (!losses.includes(currentLoss)) {
        losses.push(currentLoss);
        gains.push(currentGain);
        // Sort arrays to maintain the line's continuity
        const pairs = losses.map((loss, i) => ({ loss, gain: gains[i] }));
        pairs.sort((a, b) => a.loss - b.loss);
        losses.length = 0;
        gains.length = 0;
        pairs.forEach(pair => {
            losses.push(pair.loss);
            gains.push(pair.gain);
        });
    }
    
    // Destroy existing chart if it exists
    if (recoveryChart) {
        recoveryChart.destroy();
    }
    
    // Create new chart
    const ctx = document.getElementById('recoveryChart').getContext('2d');
    recoveryChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Required Recovery Gain',
                data: losses.map((loss, index) => ({
                    x: loss,
                    y: gains[index]
                })),
                borderColor: '#0071e3',
                backgroundColor: 'rgba(0, 113, 227, 0.1)',
                fill: true,
                tension: 0.4
            },
            {
                label: 'Your Position',
                data: [{
                    x: currentLoss,
                    y: currentGain
                }],
                pointBackgroundColor: '#FF3B30',
                pointBorderColor: '#FF3B30',
                pointRadius: 8,
                pointHoverRadius: 10,
                showLine: false,
                type: 'scatter'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: isATHMode 
                        ? `Recovery Path: Current Price to All-Time High`
                        : `Recovery Path: ${currentLoss.toFixed(1)}% Loss → ${currentGain.toFixed(1)}% Required Gain`,
                    font: {
                        size: 16
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Portfolio Loss (%)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    min: 0,
                    max: maxLoss,
                    suggestedMax: maxLoss + 5
                },
                y: {
                    title: {
                        display: true,
                        text: 'Required Recovery Gain (%)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// Add event listeners
initialInvestmentInput.addEventListener('input', () => updateCalculations('percentage'));
lossPercentageInput.addEventListener('input', () => updateCalculations('percentage'));
dollarLossInput.addEventListener('input', () => updateCalculations('dollar'));
visualizeBtn.addEventListener('click', () => {
    if (chartContainer.style.display === 'none') {
        chartContainer.style.display = 'block';
        createRecoveryChart();
        visualizeBtn.textContent = 'Hide Visualization';
        visualizeBtn.classList.add('active');
    } else {
        chartContainer.style.display = 'none';
        visualizeBtn.textContent = 'Visualize Recovery Path';
        visualizeBtn.classList.remove('active');
    }
});

// Initialize
updateCalculations('percentage');

// Clear all inputs on page load
window.onload = function() {
    initialInvestmentInput.value = '';
    dollarLossInput.value = '';
    lossPercentageInput.value = '';
    requiredGainElement.textContent = '-%';
}

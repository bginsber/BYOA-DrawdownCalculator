// Get DOM elements
const initialInvestmentInput = document.getElementById('initial-investment');
const lossPercentageInput = document.getElementById('loss-percentage');
const dollarLossInput = document.getElementById('dollar-loss-input');
const requiredGainElement = document.getElementById('required-gain');
const dollarLossElement = document.getElementById('dollar-loss');
const dollarGainElement = document.getElementById('dollar-gain');
const dollarResultsContainer = document.getElementById('dollar-results');
const chartContainer = document.getElementById('chart-container');
const visualizeBtn = document.getElementById('visualize-btn');
let recoveryChart = null;

// Calculate required gain percentage
function calculateRequiredGain(lossPercentage) {
    if (lossPercentage >= 100) return Infinity;
    const gain = (1 / (1 - lossPercentage / 100)) - 1;
    return gain * 100;
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Update calculations
function updateCalculations(sourceInput) {
    const initialInvestment = initialInvestmentInput.value ? parseFloat(initialInvestmentInput.value) : '';
    let lossPercentage = 0;
    let dollarLoss = 0;

    if (sourceInput === 'percentage') {
        lossPercentage = parseFloat(lossPercentageInput.value) || 0;
        dollarLoss = initialInvestment * (lossPercentage / 100);
        dollarLossInput.value = dollarLoss.toFixed(2);
    } else if (sourceInput === 'dollar') {
        dollarLoss = parseFloat(dollarLossInput.value) || 0;
        lossPercentage = (dollarLoss / initialInvestment) * 100;
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

// Add event listeners
initialInvestmentInput.addEventListener('input', () => updateCalculations('percentage'));
lossPercentageInput.addEventListener('input', () => updateCalculations('percentage'));
dollarLossInput.addEventListener('input', () => updateCalculations('dollar'));
visualizeBtn.addEventListener('click', () => {
    if (chartContainer.style.display === 'none') {
        chartContainer.style.display = 'block';
        createRecoveryChart();
        visualizeBtn.textContent = 'Hide Visualization';
    } else {
        chartContainer.style.display = 'none';
        visualizeBtn.textContent = 'Visualize Recovery Path';
    }
});

// Initialize
updateCalculations('percentage');

// Clear all inputs on page load
window.onload = function() {
    // Clear all input fields
    initialInvestmentInput.value = '';
    dollarLossInput.value = '';
    lossPercentageInput.value = '';
    
    // Reset result display
    requiredGainElement.textContent = '-%';
}

// Add this function to create the chart
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
    
    // Make sure we include the exact current loss point if it's not already in the array
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
                    text: `Recovery Path: ${currentLoss.toFixed(1)}% Loss → ${currentGain.toFixed(1)}% Required Gain`,
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

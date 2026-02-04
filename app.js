// Main application logic

let positions = [];
let chart = null;
let nextId = 1;
let bsMode = false;
let settings = {
    spotPrice: 100,
    riskFreeRate: 0.05,
    timeToMaturity: 1,
    volatility: 0.20
};

// Block type display names
const blockNames = {
    long_risk_free: "Long Risk-Free",
    short_risk_free: "Short Risk-Free",
    long_underlying: "Long Underlying",
    short_underlying: "Short Underlying",
    long_forward: "Long Forward/Future",
    short_forward: "Short Forward/Future",
    long_call: "Long Call",
    short_call: "Short Call",
    long_put: "Long Put",
    short_put: "Short Put"
};

// Blocks that require strike/price input only (no premium)
const noPremiumBlocks = ['long_underlying', 'short_underlying', 'long_forward', 'short_forward'];
// Blocks that require principal input only (risk-free)
const riskFreeBlocks = ['long_risk_free', 'short_risk_free'];
// Option blocks (for BS pricing)
const optionBlocks = ['long_call', 'short_call', 'long_put', 'short_put'];

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeChart();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('addBlock').addEventListener('click', addBlock);
    document.getElementById('clearAll').addEventListener('click', clearAll);
    document.getElementById('exportChart').addEventListener('click', exportChart);
    
    document.querySelectorAll('.btn-strategy').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const strategyKey = e.target.dataset.strategy;
            loadStrategy(strategyKey);
        });
    });
}

function addBlock() {
    const blockType = document.getElementById('blockType').value;
    const position = {
        id: nextId++,
        type: blockType,
        strike: settings.spotPrice,
        cost: 5,
        principal: 100,
        quantity: 1
    };
    
    // Auto-price if BS mode is on and it's an option
    if (bsMode && optionBlocks.includes(blockType)) {
        position.cost = getBSPrice(blockType, position.strike, settings);
    }
    
    positions.push(position);
    renderPositions();
    updateChart();
    updatePnLTable();
    updateRiskFreeSummary();
}

function updateSettings() {
    settings.spotPrice = parseFloat(document.getElementById('spotPrice').value) || 100;
    settings.riskFreeRate = parseFloat(document.getElementById('riskFreeRate').value) / 100 || 0.05;
    settings.timeToMaturity = parseFloat(document.getElementById('timeToMaturity').value) || 1;
    settings.volatility = parseFloat(document.getElementById('volatility').value) / 100 || 0.20;
    
    // Re-price all options if BS mode is on
    if (bsMode) {
        recalculateBSPrices();
    }
    
    updateChart();
    updatePnLTable();
    updateRiskFreeSummary();
}

function toggleBSMode() {
    bsMode = document.getElementById('bsMode').checked;
    
    if (bsMode) {
        recalculateBSPrices();
    }
    
    renderPositions();
    updateChart();
    updatePnLTable();
}

function recalculateBSPrices() {
    positions.forEach(pos => {
        if (optionBlocks.includes(pos.type)) {
            pos.cost = getBSPrice(pos.type, pos.strike, settings);
        }
    });
}

function removeBlock(id) {
    positions = positions.filter(p => p.id !== id);
    renderPositions();
    updateChart();
    updatePnLTable();
    updateRiskFreeSummary();
}

function updatePosition(id, field, value) {
    const position = positions.find(p => p.id === id);
    if (position) {
        position[field] = parseFloat(value) || 0;
        
        // Recalculate premium if BS mode and strike changed on an option
        if (bsMode && field === 'strike' && optionBlocks.includes(position.type)) {
            position.cost = getBSPrice(position.type, position.strike, settings);
            renderPositions(); // Re-render to show updated premium
        }
        
        updateChart();
        updatePnLTable();
        updateRiskFreeSummary();
    }
}

function renderPositions() {
    const container = document.getElementById('positionsList');
    
    if (positions.length === 0) {
        container.innerHTML = '<p style="color: #555; text-align: center; padding: 20px; text-transform: uppercase; font-size: 11px;">No positions added</p>';
        return;
    }
    
    container.innerHTML = positions.map(pos => {
        const isRiskFree = riskFreeBlocks.includes(pos.type);
        const isNoPremium = noPremiumBlocks.includes(pos.type);
        
        let inputsHTML = '';
        if (isRiskFree) {
            inputsHTML = `
                <div class="input-group">
                    <label>Principal</label>
                    <input type="number" 
                           value="${pos.principal}" 
                           step="1"
                           onchange="updatePosition(${pos.id}, 'principal', this.value)">
                </div>
                <div class="input-group">
                    <label>Qty</label>
                    <input type="number" 
                           value="${pos.quantity}" 
                           step="1"
                           min="1"
                           onchange="updatePosition(${pos.id}, 'quantity', this.value)">
                </div>
            `;
        } else if (isNoPremium) {
            inputsHTML = `
                <div class="input-group">
                    <label>Price</label>
                    <input type="number" 
                           value="${pos.strike}" 
                           step="0.01"
                           onchange="updatePosition(${pos.id}, 'strike', this.value)">
                </div>
                <div class="input-group">
                    <label>Qty</label>
                    <input type="number" 
                           value="${pos.quantity}" 
                           step="1"
                           min="1"
                           onchange="updatePosition(${pos.id}, 'quantity', this.value)">
                </div>
            `;
        } else {
            const isOption = optionBlocks.includes(pos.type);
            const premiumDisabled = bsMode && isOption;
            const premiumClass = premiumDisabled ? 'input-bs-auto' : '';
            
            inputsHTML = `
                <div class="input-group">
                    <label>Strike</label>
                    <input type="number" 
                           value="${pos.strike}" 
                           step="0.01"
                           onchange="updatePosition(${pos.id}, 'strike', this.value)">
                </div>
                <div class="input-group">
                    <label>${premiumDisabled ? 'Premium (BS)' : 'Premium'}</label>
                    <input type="number" 
                           class="${premiumClass}"
                           value="${pos.cost.toFixed(2)}" 
                           step="0.01"
                           ${premiumDisabled ? 'readonly' : ''}
                           onchange="updatePosition(${pos.id}, 'cost', this.value)">
                </div>
                <div class="input-group">
                    <label>Qty</label>
                    <input type="number" 
                           value="${pos.quantity}" 
                           step="1"
                           min="1"
                           onchange="updatePosition(${pos.id}, 'quantity', this.value)">
                </div>
            `;
        }
        
        return `
            <div class="position-item">
                <div class="position-header">
                    <span class="position-title">${pos.quantity > 1 ? pos.quantity + 'x ' : ''}${blockNames[pos.type]}</span>
                    <button class="btn-remove" onclick="removeBlock(${pos.id})">X</button>
                </div>
                <div class="position-inputs">
                    ${inputsHTML}
                </div>
            </div>
        `;
    }).join('');
}

function initializeChart() {
    const ctx = document.getElementById('payoffChart').getContext('2d');
    
    // Custom plugin to draw axis break indicator
    const axisBreakPlugin = {
        id: 'axisBreak',
        afterDraw: (chart) => {
            if (!chart.options.plugins.axisBreak?.enabled) return;
            
            const ctx = chart.ctx;
            const yAxis = chart.scales.y;
            const xAxis = chart.scales.x;
            
            // Draw zigzag at bottom of y-axis
            const x = yAxis.left;
            const y = yAxis.bottom;
            const size = 6;
            
            ctx.save();
            ctx.strokeStyle = '#ff9900';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x - 8, y - size * 2);
            ctx.lineTo(x + 8, y - size * 1.5);
            ctx.lineTo(x - 8, y - size);
            ctx.lineTo(x + 8, y - size * 0.5);
            ctx.stroke();
            ctx.restore();
        }
    };
    
    Chart.register(axisBreakPlugin);
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Total Payoff',
                data: [],
                borderColor: '#00ff00',
                backgroundColor: 'rgba(0, 255, 0, 0.05)',
                borderWidth: 2,
                fill: true,
                tension: 0,
                pointRadius: 0
            }, {
                label: 'Break-even',
                data: [],
                borderColor: '#ff9900',
                borderWidth: 1,
                borderDash: [4, 4],
                pointRadius: 0,
                fill: false
            }, {
                label: 'Kink Points',
                data: [],
                borderColor: 'transparent',
                backgroundColor: '#ff9900',
                pointRadius: 6,
                pointStyle: 'circle',
                pointBorderColor: '#ff9900',
                pointBorderWidth: 2,
                pointBackgroundColor: '#000',
                showLine: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                axisBreak: {
                    enabled: false
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#888',
                        font: {
                            family: "'Consolas', 'Monaco', monospace",
                            size: 11
                        },
                        boxWidth: 12,
                        padding: 15,
                        filter: function(item) {
                            return item.text !== 'Kink Points';
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'PAYOFF DIAGRAM',
                    color: '#ff9900',
                    font: {
                        family: "'Consolas', 'Monaco', monospace",
                        size: 12,
                        weight: 'normal'
                    },
                    padding: { bottom: 15 }
                },
                tooltip: {
                    backgroundColor: '#1a1a1a',
                    titleColor: '#ff9900',
                    bodyColor: '#00ff00',
                    borderColor: '#333',
                    borderWidth: 1,
                    titleFont: {
                        family: "'Consolas', 'Monaco', monospace"
                    },
                    bodyFont: {
                        family: "'Consolas', 'Monaco', monospace"
                    },
                    callbacks: {
                        title: function(context) {
                            return 'PRICE: $' + context[0].parsed.x.toFixed(2);
                        },
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                const val = context.parsed.y;
                                const color = val >= 0 ? '+' : '';
                                return `P&L: ${color}$${val.toFixed(2)}`;
                            }
                            if (context.datasetIndex === 2) {
                                return `KINK @ $${context.parsed.x.toFixed(2)}`;
                            }
                            return null;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'UNDERLYING PRICE',
                        color: '#888',
                        font: {
                            family: "'Consolas', 'Monaco', monospace",
                            size: 10
                        }
                    },
                    grid: {
                        color: '#333',
                        lineWidth: 0.5
                    },
                    ticks: {
                        color: '#888',
                        font: {
                            family: "'Consolas', 'Monaco', monospace",
                            size: 10
                        },
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'PROFIT / LOSS',
                        color: '#888',
                        font: {
                            family: "'Consolas', 'Monaco', monospace",
                            size: 10
                        }
                    },
                    grid: {
                        color: function(context) {
                            if (context.tick.value === 0) {
                                return '#ff9900';
                            }
                            return '#333';
                        },
                        lineWidth: function(context) {
                            if (context.tick.value === 0) {
                                return 1;
                            }
                            return 0.5;
                        }
                    },
                    ticks: {
                        color: '#888',
                        font: {
                            family: "'Consolas', 'Monaco', monospace",
                            size: 10
                        },
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}

function updateChart() {
    if (positions.length === 0) {
        chart.data.datasets[0].data = [];
        chart.data.datasets[1].data = [];
        chart.data.datasets[2].data = [];
        chart.options.plugins.axisBreak.enabled = false;
        chart.options.scales.y.min = undefined;
        chart.options.scales.y.max = undefined;
        chart.update();
        return;
    }

    const priceRange = determineDefaultPriceRange(positions);
    const payoffData = generatePayoffData(positions, priceRange.min, priceRange.max, settings);
    
    // Find kink points (where slope changes) - these are at strike prices
    const kinkPoints = findKinkPoints(positions, priceRange, settings);
    
    // Calculate y-axis bounds - include all kink points
    const yValues = payoffData.map(d => d.y);
    const kinkYValues = kinkPoints.map(k => k.y);
    const allYValues = [...yValues, ...kinkYValues, 0]; // Include 0 for break-even line
    
    const yMin = Math.min(...allYValues);
    const yMax = Math.max(...allYValues);
    const yRange = yMax - yMin;
    
    // Check if payoff is a flat line (constant value)
    const isFlat = yRange < 0.01;
    
    let chartYMin, chartYMax;
    let enableAxisBreak = false;
    
    if (isFlat) {
        // Flat line: center on the payoff value with +/- 5 padding
        const flatValue = yValues[0];
        chartYMin = flatValue - 5;
        chartYMax = flatValue + 5;
        // Ensure zero line is visible if payoff is near zero
        if (chartYMin > -5) chartYMin = -5;
        if (chartYMax < 5) chartYMax = 5;
    } else {
        // Add generous padding to see all inflection points clearly
        const padding = yRange * 0.15;
        chartYMin = yMin - padding;
        chartYMax = yMax + padding;
        
        // Ensure zero is always visible
        if (chartYMin > 0) chartYMin = -padding;
        if (chartYMax < 0) chartYMax = padding;
    }
    
    // Create break-even line data
    const breakEvenData = [
        { x: priceRange.min, y: 0 },
        { x: priceRange.max, y: 0 }
    ];
    
    chart.data.datasets[0].data = payoffData;
    chart.data.datasets[1].data = breakEvenData;
    chart.data.datasets[2].data = kinkPoints;
    
    chart.options.scales.y.min = chartYMin;
    chart.options.scales.y.max = chartYMax;
    chart.options.plugins.axisBreak.enabled = enableAxisBreak;
    
    chart.update();
}

function findKinkPoints(positions, priceRange, settings) {
    // Collect all strike prices where slope changes occur
    const strikes = new Set();
    
    positions.forEach(pos => {
        // Options create kinks at their strike prices
        if (['long_call', 'short_call', 'long_put', 'short_put'].includes(pos.type)) {
            strikes.add(pos.strike);
        }
        // Underlying and forwards create kinks at their entry prices (for visual reference)
        if (['long_underlying', 'short_underlying', 'long_forward', 'short_forward'].includes(pos.type)) {
            strikes.add(pos.strike);
        }
    });
    
    // Filter strikes within visible range and calculate payoff at each
    return Array.from(strikes)
        .filter(strike => strike >= priceRange.min && strike <= priceRange.max)
        .map(strike => ({
            x: strike,
            y: calculateTotalPayoff(positions, strike, settings)
        }));
}

function updatePnLTable() {
    const container = document.getElementById('pnlTable');
    
    if (positions.length === 0) {
        container.innerHTML = '<p style="color: #555; text-align: center; padding: 20px; text-transform: uppercase; font-size: 11px;">Add positions to see P&L table</p>';
        return;
    }

    const priceRange = determineDefaultPriceRange(positions);
    const step = (priceRange.max - priceRange.min) / 10;
    
    let tableHTML = '<table><thead><tr><th>Underlying Price</th><th>Total P&L</th></tr></thead><tbody>';
    
    for (let i = 0; i <= 10; i++) {
        const price = priceRange.min + (i * step);
        const pnl = calculateTotalPayoff(positions, price, settings);
        const pnlClass = pnl >= 0 ? 'positive' : 'negative';
        const sign = pnl >= 0 ? '+' : '';
        
        tableHTML += `
            <tr>
                <td>$${price.toFixed(2)}</td>
                <td class="${pnlClass}">${sign}$${pnl.toFixed(2)}</td>
            </tr>
        `;
    }
    
    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

function loadStrategy(strategyKey) {
    const strategy = Strategies[strategyKey];
    if (!strategy) return;
    
    positions = strategy.positions.map(pos => ({
        id: nextId++,
        principal: 100,
        quantity: 1,
        ...pos
    }));
    
    // Apply BS pricing if enabled
    if (bsMode) {
        recalculateBSPrices();
    }
    
    renderPositions();
    updateChart();
    updatePnLTable();
    updateRiskFreeSummary();
}

function clearAll() {
    if (positions.length > 0 && !confirm('Clear all positions?')) {
        return;
    }
    
    positions = [];
    renderPositions();
    updateChart();
    updatePnLTable();
    updateRiskFreeSummary();
}

function updateRiskFreeSummary() {
    const container = document.getElementById('riskFreeSummary');
    if (!container) return;
    
    const riskFreePositions = positions.filter(p => riskFreeBlocks.includes(p.type));
    
    if (riskFreePositions.length === 0) {
        container.innerHTML = '<p style="color: #555; text-align: center; padding: 10px; text-transform: uppercase; font-size: 11px;">No risk-free positions</p>';
        return;
    }
    
    const r = settings.riskFreeRate;
    const T = settings.timeToMaturity;
    
    let totalValueToday = 0;
    let totalValueMaturity = 0;
    
    const rows = riskFreePositions.map(pos => {
        const principal = pos.principal || 0;
        const quantity = pos.quantity || 1;
        const fv = principal * Math.exp(r * T);
        
        let valueToday, valueMaturity;
        if (pos.type === 'long_risk_free') {
            // Lending: pay principal today, receive FV at maturity
            valueToday = -principal * quantity;
            valueMaturity = fv * quantity;
        } else {
            // Borrowing: receive principal today, pay FV at maturity
            valueToday = principal * quantity;
            valueMaturity = -fv * quantity;
        }
        
        totalValueToday += valueToday;
        totalValueMaturity += valueMaturity;
        
        const signToday = valueToday >= 0 ? '+' : '';
        const signMaturity = valueMaturity >= 0 ? '+' : '';
        const classToday = valueToday >= 0 ? 'positive' : 'negative';
        const classMaturity = valueMaturity >= 0 ? 'positive' : 'negative';
        const qtyLabel = quantity > 1 ? `${quantity}x ` : '';
        
        return `
            <tr>
                <td style="text-align: left;">${qtyLabel}${blockNames[pos.type]}</td>
                <td class="${classToday}">${signToday}$${valueToday.toFixed(2)}</td>
                <td class="${classMaturity}">${signMaturity}$${valueMaturity.toFixed(2)}</td>
            </tr>
        `;
    }).join('');
    
    const signTotalToday = totalValueToday >= 0 ? '+' : '';
    const signTotalMaturity = totalValueMaturity >= 0 ? '+' : '';
    const classTotalToday = totalValueToday >= 0 ? 'positive' : 'negative';
    const classTotalMaturity = totalValueMaturity >= 0 ? 'positive' : 'negative';
    
    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th style="text-align: left;">Position</th>
                    <th>Value Today</th>
                    <th>Value at Maturity</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
                <tr style="border-top: 1px solid #ff9900;">
                    <td style="text-align: left; color: #ff9900;">TOTAL</td>
                    <td class="${classTotalToday}" style="font-weight: bold;">${signTotalToday}$${totalValueToday.toFixed(2)}</td>
                    <td class="${classTotalMaturity}" style="font-weight: bold;">${signTotalMaturity}$${totalValueMaturity.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>
    `;
}

function exportChart() {
    const link = document.createElement('a');
    link.download = 'payoff-diagram.png';
    link.href = chart.toBase64Image();
    link.click();
}

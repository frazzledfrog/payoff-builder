// Payoff calculation functions for each building block

const PayoffCalculator = {
    long_risk_free: (S, params, settings) => {
        // Long risk-free (lending): flat payoff = +desiredPayoff at maturity
        const { desiredPayoff } = params;
        return desiredPayoff;
    },

    short_risk_free: (S, params, settings) => {
        // Short risk-free (borrowing): flat payoff = -desiredPayoff at maturity
        const { desiredPayoff } = params;
        return -desiredPayoff;
    },

    long_underlying: (S, params) => {
        // Long stock/underlying: profit = S - purchase_price
        const { strike } = params;
        return S - strike;
    },

    short_underlying: (S, params) => {
        // Short stock/underlying: profit = sale_price - S
        const { strike } = params;
        return strike - S;
    },

    long_forward: (S, params) => {
        // Long forward: profit = S - forward_price (no initial cost)
        const { strike } = params;
        return S - strike;
    },

    short_forward: (S, params) => {
        // Short forward: profit = forward_price - S
        const { strike } = params;
        return strike - S;
    },

    long_call: (S, params) => {
        // Long call: max(S - K, 0) - premium
        const { strike, cost } = params;
        return Math.max(S - strike, 0) - cost;
    },

    short_call: (S, params) => {
        // Short call: premium - max(S - K, 0)
        const { strike, cost } = params;
        return cost - Math.max(S - strike, 0);
    },

    long_put: (S, params) => {
        // Long put: max(K - S, 0) - premium
        const { strike, cost } = params;
        return Math.max(strike - S, 0) - cost;
    },

    short_put: (S, params) => {
        // Short put: premium - max(K - S, 0)
        const { strike, cost } = params;
        return cost - Math.max(strike - S, 0);
    }
};

// ============================================
// Black-Scholes Pricing
// ============================================

// Standard normal cumulative distribution function
function normalCDF(x) {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
}

// Black-Scholes call price
function bsCallPrice(S, K, T, r, sigma) {
    if (T <= 0) return Math.max(S - K, 0);
    if (sigma <= 0) return Math.max(S - K * Math.exp(-r * T), 0);
    
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
}

// Black-Scholes put price
function bsPutPrice(S, K, T, r, sigma) {
    if (T <= 0) return Math.max(K - S, 0);
    if (sigma <= 0) return Math.max(K * Math.exp(-r * T) - S, 0);
    
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    
    return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
}

// Get BS price for a given option type
function getBSPrice(optionType, strike, settings) {
    const S = settings.spotPrice;
    const K = strike;
    const T = settings.timeToMaturity;
    const r = settings.riskFreeRate;
    const sigma = settings.volatility;
    
    if (optionType === 'long_call' || optionType === 'short_call') {
        return bsCallPrice(S, K, T, r, sigma);
    } else if (optionType === 'long_put' || optionType === 'short_put') {
        return bsPutPrice(S, K, T, r, sigma);
    }
    return 0;
}

// ============================================

// Calculate total payoff across all positions
function calculateTotalPayoff(positions, underlyingPrice, settings) {
    return positions.reduce((total, position) => {
        const quantity = position.quantity || 1;
        const payoff = PayoffCalculator[position.type](underlyingPrice, {
            strike: position.strike,
            cost: position.cost,
            desiredPayoff: position.desiredPayoff,
            principal: position.principal
        }, settings);
        return total + (payoff * quantity);
    }, 0);
}

// Payoff-only calculators (no premium subtracted for options)
const PayoffOnlyCalculator = {
    long_risk_free: PayoffCalculator.long_risk_free,
    short_risk_free: PayoffCalculator.short_risk_free,
    long_underlying: PayoffCalculator.long_underlying,
    short_underlying: PayoffCalculator.short_underlying,
    long_forward: PayoffCalculator.long_forward,
    short_forward: PayoffCalculator.short_forward,
    long_call: (S, params) => Math.max(S - params.strike, 0),
    short_call: (S, params) => -Math.max(S - params.strike, 0),
    long_put: (S, params) => Math.max(params.strike - S, 0),
    short_put: (S, params) => -Math.max(params.strike - S, 0)
};

// Calculate total payoff-only (no premiums) across all positions
function calculateTotalPayoffOnly(positions, underlyingPrice, settings) {
    return positions.reduce((total, position) => {
        const quantity = position.quantity || 1;
        const payoff = PayoffOnlyCalculator[position.type](underlyingPrice, {
            strike: position.strike,
            cost: position.cost,
            desiredPayoff: position.desiredPayoff,
            principal: position.principal
        }, settings);
        return total + (payoff * quantity);
    }, 0);
}

// Generate payoff data for a range of underlying prices
function generatePayoffData(positions, minPrice, maxPrice, settings, numPoints = 100, payoffOnly = false) {
    const data = [];
    const step = (maxPrice - minPrice) / (numPoints - 1);
    const calcFn = payoffOnly ? calculateTotalPayoffOnly : calculateTotalPayoff;
    
    for (let i = 0; i < numPoints; i++) {
        const price = minPrice + (i * step);
        const payoff = calcFn(positions, price, settings);
        data.push({ x: price, y: payoff });
    }
    
    return data;
}

// Determine appropriate price range based on positions
function determineDefaultPriceRange(positions) {
    if (positions.length === 0) {
        return { min: 0, max: 200 };
    }

    let strikes = positions
        .filter(p => p.strike > 0)
        .map(p => p.strike);
    
    if (strikes.length === 0) {
        return { min: 0, max: 200 };
    }

    const minStrike = Math.min(...strikes);
    const maxStrike = Math.max(...strikes);
    const range = maxStrike - minStrike;
    
    const padding = range > 0 ? range * 0.5 : 50;
    
    return {
        min: Math.max(0, minStrike - padding),
        max: maxStrike + padding
    };
}

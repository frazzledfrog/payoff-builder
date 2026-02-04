// Preset strategy templates

const Strategies = {
    straddle: {
        name: "Long Straddle",
        description: "Buy call and put at same strike",
        positions: [
            { type: "long_call", strike: 100, cost: 5 },
            { type: "long_put", strike: 100, cost: 5 }
        ]
    },

    strangle: {
        name: "Long Strangle",
        description: "Buy OTM call and OTM put",
        positions: [
            { type: "long_call", strike: 110, cost: 3 },
            { type: "long_put", strike: 90, cost: 3 }
        ]
    },

    butterfly: {
        name: "Butterfly Spread",
        description: "Limited risk/reward symmetric strategy",
        positions: [
            { type: "long_call", strike: 90, cost: 12 },
            { type: "short_call", strike: 100, cost: 6 },
            { type: "short_call", strike: 100, cost: 6 },
            { type: "long_call", strike: 110, cost: 3 }
        ]
    },

    collar: {
        name: "Collar",
        description: "Long stock, long put, short call",
        positions: [
            { type: "long_underlying", strike: 100, cost: 100 },
            { type: "long_put", strike: 95, cost: 2 },
            { type: "short_call", strike: 105, cost: 2 }
        ]
    },

    covered_call: {
        name: "Covered Call",
        description: "Long stock + short call",
        positions: [
            { type: "long_underlying", strike: 100, cost: 100 },
            { type: "short_call", strike: 110, cost: 5 }
        ]
    },

    protective_put: {
        name: "Protective Put",
        description: "Long stock + long put",
        positions: [
            { type: "long_underlying", strike: 100, cost: 100 },
            { type: "long_put", strike: 95, cost: 4 }
        ]
    },

    bull_spread: {
        name: "Bull Call Spread",
        description: "Buy low strike call, sell high strike call",
        positions: [
            { type: "long_call", strike: 95, cost: 8 },
            { type: "short_call", strike: 105, cost: 3 }
        ]
    },

    bear_spread: {
        name: "Bear Put Spread",
        description: "Buy high strike put, sell low strike put",
        positions: [
            { type: "long_put", strike: 105, cost: 8 },
            { type: "short_put", strike: 95, cost: 3 }
        ]
    }
};

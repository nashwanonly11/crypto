/* The tradable universe.
   Figures are DEMO anchors used to shape believable charts — the app labels
   them as such in the persistent status strip. Each entry carries the market
   characteristics the series generator needs: volatility, drift and float. */

export const SECTORS = {
  L1: 'Layer 1',
  L2: 'Layer 2',
  DEFI: 'DeFi',
  ORACLE: 'Oracles',
  AI: 'AI compute',
  INFRA: 'Infrastructure',
  DATA: 'Data',
  GAMING: 'Gaming',
};

/**
 * `tier` orders the market table by size; `vol` is a daily standard deviation
 * as a fraction, `drift` is an annualised tendency, `float` is circulating
 * supply used for market-cap maths.
 */
export const UNIVERSE = [
  { symbol: 'BTC', name: 'Bitcoin', sector: 'L1', tier: 'mega', anchor: 68412.3, float: 19.7e6, max: 21e6, vol: 0.021, drift: 0.34, chain: 'Bitcoin', launched: 2009 },
  { symbol: 'ETH', name: 'Ethereum', sector: 'L1', tier: 'mega', anchor: 3418.62, float: 120.2e6, max: null, vol: 0.026, drift: 0.28, chain: 'Ethereum', launched: 2015 },
  { symbol: 'SOL', name: 'Solana', sector: 'L1', tier: 'mega', anchor: 172.44, float: 462.1e6, max: null, vol: 0.042, drift: 0.41, chain: 'Solana', launched: 2020 },
  { symbol: 'BNB', name: 'BNB', sector: 'L1', tier: 'large', anchor: 592.18, float: 148.3e6, max: 200e6, vol: 0.024, drift: 0.18, chain: 'BNB Chain', launched: 2017 },
  { symbol: 'XRP', name: 'XRP', sector: 'DATA', tier: 'large', anchor: 0.6214, float: 55.6e9, max: 100e9, vol: 0.033, drift: 0.11, chain: 'XRP Ledger', launched: 2012 },
  { symbol: 'ADA', name: 'Cardano', sector: 'L1', tier: 'large', anchor: 0.4471, float: 35.4e9, max: 45e9, vol: 0.035, drift: -0.06, chain: 'Cardano', launched: 2017 },
  { symbol: 'AVAX', name: 'Avalanche', sector: 'L1', tier: 'large', anchor: 36.92, float: 395.4e6, max: 720e6, vol: 0.045, drift: 0.09, chain: 'Avalanche', launched: 2020 },
  { symbol: 'DOT', name: 'Polkadot', sector: 'L1', tier: 'mid', anchor: 6.84, float: 1.44e9, max: null, vol: 0.038, drift: -0.12, chain: 'Polkadot', launched: 2020 },
  { symbol: 'LINK', name: 'Chainlink', sector: 'ORACLE', tier: 'large', anchor: 17.26, float: 587.1e6, max: 1e9, vol: 0.041, drift: 0.22, chain: 'Ethereum', launched: 2017 },
  { symbol: 'ARB', name: 'Arbitrum', sector: 'L2', tier: 'mid', anchor: 1.124, float: 3.02e9, max: 10e9, vol: 0.052, drift: -0.18, chain: 'Arbitrum', launched: 2023 },
  { symbol: 'OP', name: 'Optimism', sector: 'L2', tier: 'mid', anchor: 2.418, float: 1.06e9, max: 4.29e9, vol: 0.051, drift: -0.14, chain: 'Optimism', launched: 2022 },
  { symbol: 'SUI', name: 'Sui', sector: 'L1', tier: 'mid', anchor: 1.638, float: 2.79e9, max: 10e9, vol: 0.056, drift: 0.52, chain: 'Sui', launched: 2023 },
  { symbol: 'TON', name: 'Toncoin', sector: 'INFRA', tier: 'large', anchor: 7.42, float: 2.47e9, max: null, vol: 0.043, drift: 0.16, chain: 'TON', launched: 2019 },
  { symbol: 'ATOM', name: 'Cosmos', sector: 'INFRA', tier: 'mid', anchor: 8.94, float: 390.7e6, max: null, vol: 0.039, drift: -0.09, chain: 'Cosmos Hub', launched: 2019 },
  { symbol: 'NEAR', name: 'NEAR Protocol', sector: 'L1', tier: 'mid', anchor: 5.216, float: 1.09e9, max: null, vol: 0.049, drift: 0.31, chain: 'NEAR', launched: 2020 },
  { symbol: 'INJ', name: 'Injective', sector: 'DEFI', tier: 'mid', anchor: 24.18, float: 97.7e6, max: 100e6, vol: 0.058, drift: 0.12, chain: 'Injective', launched: 2021 },
  { symbol: 'TIA', name: 'Celestia', sector: 'DATA', tier: 'mid', anchor: 6.12, float: 214.3e6, max: 1.09e9, vol: 0.061, drift: -0.24, chain: 'Celestia', launched: 2023 },
  { symbol: 'RNDR', name: 'Render', sector: 'AI', tier: 'mid', anchor: 8.34, float: 518.9e6, max: null, vol: 0.057, drift: 0.38, chain: 'Solana', launched: 2020 },
  { symbol: 'FET', name: 'Artificial Superintelligence', sector: 'AI', tier: 'mid', anchor: 2.284, float: 2.52e9, max: 2.63e9, vol: 0.064, drift: 0.44, chain: 'Fetch.ai', launched: 2019 },
  { symbol: 'IMX', name: 'Immutable', sector: 'GAMING', tier: 'mid', anchor: 1.842, float: 1.52e9, max: 2e9, vol: 0.055, drift: -0.21, chain: 'Immutable zkEVM', launched: 2021 },
];

/** Fast lookup by ticker. */
export const BY_SYMBOL = new Map(UNIVERSE.map((asset) => [asset.symbol, asset]));

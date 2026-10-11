/* Derived market analytics.
   Everything here is computed from the quote set rather than hard-coded, so
   the dashboard, the index chart and the sentiment gauge always agree. */

import { market } from './market.js';
import { changePercent, range } from './series.js';

const INDEX_BASE = 1000;
const SENTIMENT_NEUTRAL = 50;
const SENTIMENT_SENSITIVITY = 2.4;

/** Capitalisation-weighted index, rebased to 1000 at the start of the window. */
export function indexSeries(rangeKey = '1Y') {
  const assets = market.assets;
  const last = assets.map((asset) => asset.series[rangeKey].at(-1) || 1);
  const length = assets[0].series[rangeKey].length;
  const raw = [];
  for (let i = 0; i < length; i += 1) {
    let total = 0;
    for (let a = 0; a < assets.length; a += 1) {
      total += assets[a].marketCap * (assets[a].series[rangeKey][i] / last[a]);
    }
    raw.push(total);
  }
  const base = raw[0] || 1;
  return raw.map((value) => (value / base) * INDEX_BASE);
}

/** Index level, change and window range as one readout object. */
export function indexSnapshot(rangeKey = '1Y') {
  const series = indexSeries(rangeKey);
  return {
    range: rangeKey,
    series,
    level: series.at(-1),
    change: changePercent(series),
    window: range(series),
  };
}

/** Share of total capitalisation held by the two largest assets. */
export function dominance() {
  const btc = market.bySymbol.get('BTC');
  const eth = market.bySymbol.get('ETH');
  const btcShare = btc ? btc.marketCap / market.totalCap : 0;
  const ethShare = eth ? eth.marketCap / market.totalCap : 0;
  return {
    btc: btcShare,
    eth: ethShare,
    rest: Math.max(0, 1 - btcShare - ethShare),
  };
}

/** Advancers vs decliners over a rolling window. */
export function breadth(rangeKey = '24H') {
  let advancers = 0;
  let decliners = 0;
  let flat = 0;
  let sum = 0;
  for (const asset of market.assets) {
    const change = asset.change[rangeKey];
    sum += change;
    if (change > 0.05) advancers += 1;
    else if (change < -0.05) decliners += 1;
    else flat += 1;
  }
  return {
    advancers,
    decliners,
    flat,
    total: market.assets.length,
    average: sum / market.assets.length,
  };
}

/** Cap-weighted performance per sector over a window. */
export function sectorPerformance(rangeKey = '24H') {
  const buckets = new Map();
  for (const asset of market.assets) {
    const bucket = buckets.get(asset.sector) || { sector: asset.sector, label: market.sectors[asset.sector], cap: 0, weighted: 0, members: 0 };
    bucket.cap += asset.marketCap;
    bucket.weighted += asset.marketCap * asset.change[rangeKey];
    bucket.members += 1;
    buckets.set(asset.sector, bucket);
  }
  return Array.from(buckets.values())
    .map((bucket) => ({ ...bucket, change: bucket.weighted / (bucket.cap || 1) }))
    .sort((a, b) => b.change - a.change);
}

/** Largest gainers and losers over a window. */
export function movers(rangeKey = '24H', count = 4) {
  const ordered = market.assets.slice().sort((a, b) => b.change[rangeKey] - a.change[rangeKey]);
  return {
    gainers: ordered.slice(0, count),
    losers: ordered.slice(-count).reverse(),
  };
}

/** Highest traded names, used by the volume rail. */
export function mostTraded(count = 5) {
  return market.assets
    .slice()
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, count);
}

/**
 * Sentiment gauge, 0 (capitulation) to 100 (euphoria).
 * Blends average change, market breadth and realised dispersion.
 */
export function sentiment() {
  const stats = breadth('24H');
  const score = Math.max(0, Math.min(100,
    SENTIMENT_NEUTRAL + stats.average * SENTIMENT_SENSITIVITY
    + ((stats.advancers - stats.decliners) / stats.total) * 18,
  ));
  return {
    score,
    label: sentimentLabel(score),
    breadth: stats,
  };
}

function sentimentLabel(score) {
  if (score >= 78) return 'Euphoric';
  if (score >= 62) return 'Greedy';
  if (score >= 46) return 'Composed';
  if (score >= 30) return 'Cautious';
  return 'Capitulating';
}

/** How concentrated the universe is: the top-N share of total capitalisation. */
export function concentration(n = 3) {
  const caps = market.assets.map((asset) => asset.marketCap).sort((a, b) => b - a);
  const top = caps.slice(0, n).reduce((sum, value) => sum + value, 0);
  return top / market.totalCap;
}

/** Number of assets sitting within 10% of their 1-year high. */
export function nearHighs(threshold = -10) {
  return market.assets.filter((asset) => asset.fromAth >= threshold).length;
}

/** Realised annualised volatility of the index across its daily window. */
export function indexVolatility() {
  const series = indexSeries('1Y');
  const returns = [];
  for (let i = 1; i < series.length; i += 1) {
    returns.push(Math.log(series[i] / series[i - 1]));
  }
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(365) * 100;
}

/* Order book and trade tape for an asset detail view.
   Levels and fills are derived from the asset's own price and 24h volatility
   so cheap assets show tight ticks and volatile ones show wide ones. */

import { mulberry32, hashSeed } from '../lib/prng.js';

const LEVELS = 14;
const TICK_SPREAD = 0.0009;
const DEPTH_SHAPE = 1.35;
const TAPE_SIZE = 24;

/** Price increment that keeps every level readable at the asset's scale. */
function tickSize(price) {
  const magnitude = 10 ** Math.floor(Math.log10(price));
  return magnitude / (price >= 100 ? 100 : 1000);
}

function round(value, digits) {
  return Number(value.toFixed(digits));
}

function decimalsFor(price) {
  if (price >= 1000) return 2;
  if (price >= 1) return 3;
  if (price >= 0.01) return 5;
  return 7;
}

/**
 * Build a symmetric book around the mid price with a liquidity profile that
 * thickens away from the touch — the classic stair the depth chart draws.
 */
export function buildBook(asset) {
  const random = mulberry32(hashSeed(`${asset.symbol}:book`));
  const digits = decimalsFor(asset.price);
  const tick = tickSize(asset.price);
  const spread = asset.price * (TICK_SPREAD + asset.vol * 0.02);
  const mid = asset.price;
  const bids = [];
  const asks = [];

  let bidDepth = 0;
  let askDepth = 0;
  for (let i = 0; i < LEVELS; i += 1) {
    const distance = (i + 1) * spread;
    const shape = (LEVELS - i) ** DEPTH_SHAPE;
    const sizeUnit = (asset.marketCap / 1e9) * (0.4 + random());
    const bidSize = round((shape * sizeUnit) / (LEVELS ** DEPTH_SHAPE) * 100, 2);
    const askSize = round((shape * sizeUnit) / (LEVELS ** DEPTH_SHAPE) * (0.9 + random() * 0.3) * 100, 2);
    bidDepth += bidSize;
    askDepth += askSize;
    bids.push({ price: round(mid - distance, digits), size: bidSize, cumulative: round(bidDepth, 2) });
    asks.push({ price: round(mid + distance, digits), size: askSize, cumulative: round(askDepth, 2) });
  }

  const spreadAbsolute = asks[0].price - bids[0].price;
  return {
    bids,
    asks,
    mid,
    spread: spreadAbsolute,
    spreadPercent: (spreadAbsolute / mid) * 100,
    imbalance: bidDepth / (bidDepth + askDepth),
  };
}

const TAPE_SIDES = ['buy', 'sell'];

/** Recent prints, newest first. */
export function buildTape(asset) {
  const random = mulberry32(hashSeed(`${asset.symbol}:tape`));
  const digits = decimalsFor(asset.price);
  const clock = Date.now();
  const tape = [];
  for (let i = 0; i < TAPE_SIZE; i += 1) {
    const drift = (random() - 0.5) * asset.price * asset.vol * 0.35;
    const price = round(asset.price + drift, digits);
    const size = round((0.5 + random() * 24) * (asset.price > 1000 ? 0.4 : asset.price > 10 ? 3 : 400), 2);
    tape.push({
      id: `${asset.symbol}-${i}`,
      side: random() > (asset.change['24H'] >= 0 ? 0.46 : 0.58) ? 'buy' : 'sell',
      price,
      size,
      value: price * size,
      at: clock - i * 1000 * (7 + Math.floor(random() * 40)),
    });
  }
  return tape;
}

/** Two-sided liquidity readout used in the market-depth tile. */
export function bookSummary(book) {
  return {
    bidDepth: book.bids.at(-1).cumulative,
    askDepth: book.asks.at(-1).cumulative,
    imbalance: book.imbalance,
    spread: book.spread,
    spreadPercent: book.spreadPercent,
  };
}

/** Side helpers keep the tone vocabulary in one place. */
export function tapeTone(side) {
  return TAPE_SIDES.includes(side) ? side : 'buy';
}

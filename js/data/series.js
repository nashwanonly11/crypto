/* Deterministic price-series generator.
   Each symbol gets a geometric-random-walk path derived from a stable hash,
   then rescaled so the most recent close lands exactly on the asset's anchor
   price. Reloading the page therefore redraws the identical market. */

import { mulberry32, hashSeed, gaussian } from '../lib/prng.js';

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const YEAR = 365 * DAY;

const MAX_INTRABAR_WICK = 0.6;
const VOLUME_FLOOR = 0.55;

/** "Now" rounded down to the hour, so a session stays coherent but stays live. */
export function marketClock() {
  return Math.floor(Date.now() / HOUR) * HOUR;
}

/**
 * Build a candle series ending at `anchorPrice`.
 * steps × stepMs covers the window; volatility and drift are annualised.
 */
export function buildCandles({ symbol, anchorPrice, steps, stepMs, vol, drift, clock = marketClock(), salt = 'd' }) {
  const random = mulberry32(hashSeed(`${symbol}:${salt}`));
  const sigma = vol * Math.sqrt(stepMs / DAY);
  const mu = drift * (stepMs / YEAR);
  const closes = [1];
  for (let i = 1; i < steps; i += 1) {
    const shock = gaussian(random);
    closes.push(closes[i - 1] * Math.exp(mu - 0.5 * sigma * sigma + sigma * shock));
  }
  const scale = anchorPrice / closes[closes.length - 1];
  const startTime = clock - stepMs * (steps - 1);

  return closes.map((value, index) => {
    const close = value * scale;
    const open = (index === 0 ? close / (1 + sigma * 0.4) : closes[index - 1] * scale);
    const wickUp = Math.abs(gaussian(random)) * sigma * MAX_INTRABAR_WICK;
    const wickDown = Math.abs(gaussian(random)) * sigma * MAX_INTRABAR_WICK;
    const high = Math.max(open, close) * (1 + wickUp);
    const low = Math.min(open, close) * (1 - wickDown);
    const move = Math.abs(close / open - 1);
    const volume = VOLUME_FLOOR + random() * 0.9 + (move / (sigma || 1)) * 1.8;
    return { t: startTime + stepMs * index, open, high, low, close, volume: Number(volume.toFixed(4)) };
  });
}

/** Extract the close column. */
export function closes(candles) {
  return candles.map((candle) => candle.close);
}

/** Extract the volume column. */
export function volumes(candles) {
  return candles.map((candle) => candle.volume);
}

/** Percentage change between the first and last value of a series. */
export function changePercent(values) {
  if (!values.length) return 0;
  const first = values[0];
  const last = values[values.length - 1];
  if (!first) return 0;
  return ((last - first) / first) * 100;
}

/** Downsample a series to at most `max` points, keeping the last point exact. */
export function downsample(values, max) {
  if (values.length <= max) return values.slice();
  const stride = Math.ceil(values.length / max);
  const out = [];
  for (let i = 0; i < values.length; i += stride) out.push(values[i]);
  if (out[out.length - 1] !== values[values.length - 1]) out.push(values[values.length - 1]);
  return out;
}

/** Rolling high/low across a window, used for the 24h range readout. */
export function range(values) {
  let low = Infinity;
  let high = -Infinity;
  for (const value of values) {
    if (value < low) low = value;
    if (value > high) high = value;
  }
  return { low: Number.isFinite(low) ? low : 0, high: Number.isFinite(high) ? high : 0 };
}

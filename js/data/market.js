/* Market service: turns the static universe into live quotes.
   One clock is fixed at module load so every page in the session agrees on
   prices, percentages and timestamps. */

import { UNIVERSE, SECTORS } from './universe.js';
import {
  buildCandles, closes, volumes, changePercent, downsample, range,
  marketClock, HOUR, DAY,
} from './series.js';

export const RANGES = ['24H', '7D', '30D', '1Y'];

const HOURLY_STEPS = 14 * 24;
const DAILY_STEPS = 365;
const ATH_PREMIUM = 1.42;
const ATH_PENALTY = 0.88;

/** Series windows drawn from the hourly and daily paths. */
const WINDOWS = {
  '24H': { source: 'hourly', take: 25 },
  '7D': { source: 'hourly', take: 7 * 24 + 1 },
  '30D': { source: 'daily', take: 31 },
  '1Y': { source: 'daily', take: DAILY_STEPS },
};

function buildQuote(definition, clock) {
  const hourly = buildCandles({
    symbol: definition.symbol,
    anchorPrice: definition.anchor,
    steps: HOURLY_STEPS,
    stepMs: HOUR,
    vol: definition.vol,
    drift: definition.drift,
    clock,
    salt: 'hour',
  });
  const daily = buildCandles({
    symbol: definition.symbol,
    anchorPrice: definition.anchor,
    steps: DAILY_STEPS,
    stepMs: DAY,
    vol: definition.vol,
    drift: definition.drift,
    clock,
    salt: 'day',
  });

  const sources = { hourly, daily };
  const price = hourly[hourly.length - 1].close;
  const candles = {};
  const series = {};
  const change = {};

  for (const rangeKey of RANGES) {
    const window = WINDOWS[rangeKey];
    const slice = sources[window.source].slice(-window.take);
    candles[rangeKey] = slice;
    series[rangeKey] = closes(slice);
    change[rangeKey] = Number(changePercent(series[rangeKey]).toFixed(2));
  }

  const lastDay = daily[daily.length - 1];
  const ath = Math.max(...daily.map((candle) => candle.high)) * ATH_PREMIUM;
  const athIndex = Math.floor(daily.length * ATH_PENALTY);
  const volume24h = volumes(hourly.slice(-24)).reduce((sum, value) => sum + value, 0);

  return {
    ...definition,
    price,
    change,
    candles,
    series,
    spark: downsample(series['30D'], 32),
    window24h: range(series['24H']),
    marketCap: price * definition.float,
    volume24h,
    ath,
    athAt: daily[athIndex].t,
    fromAth: ((price - ath) / ath) * 100,
    turnover: 0,
  };
}

function buildMarket() {
  const clock = marketClock();
  const assets = UNIVERSE.map((definition) => buildQuote(definition, clock));
  const totalCap = assets.reduce((sum, asset) => sum + asset.marketCap, 0);
  const totalVolume = assets.reduce((sum, asset) => sum + asset.volume24h, 0);

  for (const asset of assets) {
    asset.dominance = asset.marketCap / totalCap;
    asset.turnover = asset.volume24h / asset.marketCap;
  }

  return {
    clock,
    assets,
    bySymbol: new Map(assets.map((asset) => [asset.symbol, asset])),
    totalCap,
    totalVolume,
    sectors: SECTORS,
  };
}

const instance = buildMarket();

export const market = instance;

/** Look up a single asset by ticker. */
export function getAsset(symbol) {
  return instance.bySymbol.get(String(symbol).toUpperCase()) || null;
}

/** All assets, optionally filtered by a free-text query. */
export function searchAssets(query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return instance.assets;
  return instance.assets.filter((asset) => (
    asset.symbol.toLowerCase().includes(needle)
    || asset.name.toLowerCase().includes(needle)
    || asset.chain.toLowerCase().includes(needle)
  ));
}

/** Sort assets by a market-table column. */
export function sortAssets(assets, column, descending = true) {
  const sign = descending ? -1 : 1;
  const read = (asset) => {
    switch (column) {
      case 'name': return asset.name;
      case 'price': return asset.price;
      case 'change': return asset.change['24H'];
      case 'change7d': return asset.change['7D'];
      case 'cap': return asset.marketCap;
      case 'volume': return asset.volume24h;
      default: return asset.marketCap;
    }
  };
  return assets.slice().sort((a, b) => {
    const left = read(a);
    const right = read(b);
    if (typeof left === 'string') return sign * left.localeCompare(right);
    return sign * (left - right);
  });
}

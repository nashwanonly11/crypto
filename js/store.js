/* Session store: watchlist, holdings, settings and onboarding state.
   Persisted to localStorage and broadcast to subscribers so any view can
   re-render after a mutation without a page reload. */

import { market, getAsset } from './data/market.js';

const STORAGE_KEY = 'vector.session.v1';
const DEFAULT_HOLDINGS = [
  { symbol: 'BTC', units: 0.42, cost: 51230.4 },
  { symbol: 'ETH', units: 6.1, cost: 2894.12 },
  { symbol: 'SOL', units: 48, cost: 121.7 },
  { symbol: 'LINK', units: 320, cost: 14.02 },
];
const DEFAULT_WATCHLIST = ['BTC', 'ETH', 'SOL', 'AVAX', 'RNDR', 'TIA'];
const DEFAULT_SETTINGS = {
  currency: 'USD',
  range: '1Y',
  chartMode: 'line',
  liveTicks: true,
  compactRows: false,
  priceAlerts: true,
  weeklyDigest: false,
  riskProfile: 'balanced',
};

const RISK_LABELS = {
  defensive: 'Defensive',
  balanced: 'Balanced',
  aggressive: 'Aggressive',
};

function readPersisted() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function initialState() {
  const persisted = readPersisted();
  return {
    onboarded: persisted?.onboarded ?? false,
    watchlist: persisted?.watchlist ?? DEFAULT_WATCHLIST.slice(),
    holdings: persisted?.holdings ?? DEFAULT_HOLDINGS.map((row) => ({ ...row })),
    settings: { ...DEFAULT_SETTINGS, ...(persisted?.settings || {}) },
  };
}

let state = initialState();
const subscribers = new Set();

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    /* Storage can be unavailable in private mode; the session still works. */
  }
}

function commit(patch) {
  state = { ...state, ...patch };
  persist();
  subscribers.forEach((listener) => listener(state));
}

/** Subscribe to state changes. Returns an unsubscribe function. */
export function subscribe(listener) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

export function getState() {
  return state;
}

/* ---------------------------------------------------------------- watchlist */

export function isWatched(symbol) {
  return state.watchlist.includes(symbol);
}

export function toggleWatch(symbol) {
  const watched = state.watchlist.includes(symbol);
  const next = watched
    ? state.watchlist.filter((item) => item !== symbol)
    : [...state.watchlist, symbol];
  commit({ watchlist: next });
  return !watched;
}

export function setWatchlist(symbols) {
  commit({ watchlist: Array.from(new Set(symbols)) });
}

export function watchedAssets() {
  return state.watchlist.map((symbol) => getAsset(symbol)).filter(Boolean);
}

/* ----------------------------------------------------------------- holdings */

export function holdingsWithQuotes() {
  return state.holdings.map((row) => {
    const asset = getAsset(row.symbol);
    const price = asset ? asset.price : 0;
    const value = price * row.units;
    const basis = row.cost * row.units;
    return {
      ...row,
      asset,
      name: asset ? asset.name : row.symbol,
      price,
      value,
      basis,
      pnl: value - basis,
      pnlPercent: basis ? ((value - basis) / basis) * 100 : 0,
    };
  }).filter((row) => row.asset);
}

export function portfolioTotals() {
  const rows = holdingsWithQuotes();
  const value = rows.reduce((sum, row) => sum + row.value, 0);
  const basis = rows.reduce((sum, row) => sum + row.basis, 0);
  return {
    rows,
    value,
    basis,
    pnl: value - basis,
    pnlPercent: basis ? ((value - basis) / basis) * 100 : 0,
    positions: rows.length,
  };
}

export function upsertHolding(symbol, units, cost) {
  const next = state.holdings.filter((row) => row.symbol !== symbol);
  if (units > 0) next.push({ symbol, units, cost });
  commit({ holdings: next });
}

export function removeHolding(symbol) {
  commit({ holdings: state.holdings.filter((row) => row.symbol !== symbol) });
}

/* ----------------------------------------------------------------- settings */

export function settings() {
  return state.settings;
}

export function updateSetting(key, value) {
  commit({ settings: { ...state.settings, [key]: value } });
}

export function riskLabel(profile = state.settings.riskProfile) {
  return RISK_LABELS[profile] || RISK_LABELS.balanced;
}

export const RISK_PROFILES = Object.entries(RISK_LABELS).map(([id, label]) => ({ id, label }));

/* --------------------------------------------------------------- onboarding */

export function completeOnboarding() {
  commit({ onboarded: true });
}

export function isOnboarded() {
  return state.onboarded;
}

export function resetSession() {
  state = {
    onboarded: false,
    watchlist: DEFAULT_WATCHLIST.slice(),
    holdings: DEFAULT_HOLDINGS.map((row) => ({ ...row })),
    settings: { ...DEFAULT_SETTINGS },
  };
  persist();
  subscribers.forEach((listener) => listener(state));
}

/** Portfolio value over the index window, forming the equity curve. */
export function portfolioCurve(rangeKey = state.settings.range) {
  const rows = holdingsWithQuotes();
  if (!rows.length) return [];
  const length = market.assets[0].series[rangeKey].length;
  const curve = new Array(length).fill(0);
  for (const row of rows) {
    const series = row.asset.series[rangeKey];
    const last = series.at(-1) || 1;
    for (let i = 0; i < length; i += 1) {
      curve[i] += row.units * last * (series[i] / last);
    }
  }
  return curve;
}

/** Allocation shares for the holdings donut. */
export function allocation() {
  const rows = holdingsWithQuotes();
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  return rows
    .map((row) => ({ symbol: row.symbol, name: row.name, value: row.value, share: row.value / total }))
    .sort((a, b) => b.value - a.value);
}

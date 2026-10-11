/* Number, currency and time formatting for the VECTOR terminal.
   All values are formatted for a mono blueprint readout: fixed precision,
   compact suffixes, no locale surprises across browsers. */

const COMPACT_UNITS = [
  { limit: 1e12, suffix: 'T' },
  { limit: 1e9, suffix: 'B' },
  { limit: 1e6, suffix: 'M' },
  { limit: 1e3, suffix: 'K' },
];

/** Compact magnitude, e.g. 1_240_000_000 -> "1.24B". */
export function compact(value, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  for (const unit of COMPACT_UNITS) {
    if (abs >= unit.limit) {
      return `${(value / unit.limit).toFixed(digits)}${unit.suffix}`;
    }
  }
  return abs >= 100 ? value.toFixed(0) : value.toFixed(digits);
}

/** Adaptive price precision: large caps get 2dp, sub-dollar assets get more. */
export function price(value) {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Price with currency prefix, e.g. "$68,412.30". */
export function usd(value, digits) {
  if (!Number.isFinite(value)) return '—';
  if (digits === undefined) return `$${price(value)}`;
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

/** Signed percentage, e.g. "+4.21%" / "-1.08%". */
export function pct(value, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

/** Signed currency delta, e.g. "+$420.10". */
export function signedUsd(value, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${usd(Math.abs(value), digits)}`;
}

/** 0.6231 -> "62.3%". No sign. */
export function ratio(value, digits = 1) {
  if (!Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

/** Short date for axis ticks, e.g. "14 Mar". */
export function axisDay(timestamp) {
  const d = new Date(timestamp);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** Time for intraday ticks, e.g. "13:40". */
export function axisTime(timestamp) {
  const d = new Date(timestamp);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/** Relative age, e.g. "4m ago". */
export function ago(timestamp, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Clamp helper used across the chart layer. */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Direction word used for tone classes. */
export function direction(value) {
  if (value > 0.0001) return 'up';
  if (value < -0.0001) return 'down';
  return 'flat';
}

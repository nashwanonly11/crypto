/* Linear scales and tick generation for the SVG chart layer.
   Charts are drawn in viewBox units, so a scale is a pure number mapper. */

import { clamp } from './format.js';

/** Build a linear scale from a numeric domain onto a numeric range. */
export function linear(domain, range) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  const scale = (value) => r0 + ((value - d0) / span) * (r1 - r0);
  scale.domain = domain;
  scale.range = range;
  scale.invert = (value) => d0 + ((value - r0) / (r1 - r0 || 1)) * span;
  return scale;
}

/** Min/max of a numeric array, optionally padded outward by a ratio. */
export function extent(values, pad = 0) {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) return [min - 1, max + 1];
  const room = (max - min) * pad;
  return [min - room, max + room];
}

const STEP_MULTIPLIERS = [1, 2, 2.5, 5, 10];

/** Produce roughly `count` human-readable ticks inside [min, max]. */
export function ticks(min, max, count = 4) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min];
  const raw = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  let step = STEP_MULTIPLIERS[STEP_MULTIPLIERS.length - 1] * magnitude;
  for (const multiplier of STEP_MULTIPLIERS) {
    if (normalized <= multiplier) {
      step = multiplier * magnitude;
      break;
    }
  }
  const first = Math.ceil(min / step) * step;
  const out = [];
  for (let value = first; value <= max + step * 1e-6; value += step) {
    out.push(Number(value.toFixed(10)));
  }
  return out.length ? out : [min, max];
}

/** Round a value down to a friendly axis bound. */
export function niceCeil(value) {
  if (!Number.isFinite(value) || value === 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(Math.abs(value)));
  return Math.ceil(value / magnitude) * magnitude;
}

/** Path string for a polyline through [x, y] pairs. */
export function linePath(points) {
  if (!points.length) return '';
  return points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${round(x)} ${round(y)}`)
    .join(' ');
}

/** Diagonal hatch path used as an area fill — the blueprint's "ghost volume". */
export function areaPath(points, baseline) {
  if (!points.length) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)} L${round(last[0])} ${round(baseline)} L${round(first[0])} ${round(baseline)} Z`;
}

export function round(value) {
  return Math.round(value * 100) / 100;
}

/** Clamp a chart value into range without importing format everywhere. */
export { clamp };

/* Ring, donut and depth renderers.
   Segments are separated by stroke-dasharray patterns rather than colour, so
   the wireframe stays legible in a single ink. */

import { svg } from './dom.js';
import { round, clamp } from './scale.js';

const TAU = Math.PI * 2;

/** Draw an arc as a stroked circle path starting at 12 o'clock. */
function arcPath(cx, cy, radius, startRatio, endRatio) {
  const start = startRatio * TAU - Math.PI / 2;
  const end = endRatio * TAU - Math.PI / 2;
  const x1 = cx + Math.cos(start) * radius;
  const y1 = cy + Math.sin(start) * radius;
  const x2 = cx + Math.cos(end) * radius;
  const y2 = cy + Math.sin(end) * radius;
  const large = endRatio - startRatio > 0.5 ? 1 : 0;
  return `M${round(x1)} ${round(y1)} A${radius} ${radius} 0 ${large} 1 ${round(x2)} ${round(y2)}`;
}

/**
 * Score ring: a full track plus a value arc, with the number set in the middle.
 * `value` is a 0..1 ratio; anything outside is clamped.
 */
export function scoreRing({ size = 132, value = 0, label = '', caption = '', thickness = 8 }) {
  const radius = (size - thickness) / 2;
  const centre = size / 2;
  const ratio = clamp(value, 0, 1);
  return svg('svg', {
    class: 'ring',
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`,
    role: 'img',
    'aria-label': `${label} ${Math.round(ratio * 100)} percent`,
  }, [
    svg('circle', { class: 'ring__track', cx: centre, cy: centre, r: radius, 'stroke-width': thickness }),
    svg('path', {
      class: 'ring__value',
      d: arcPath(centre, centre, radius, 0, Math.max(ratio, 0.001)),
      'stroke-width': thickness,
      'stroke-linecap': 'butt',
    }),
    svg('text', { class: 'ring__label', x: centre, y: centre - 1, 'text-anchor': 'middle' }, [label]),
    svg('text', { class: 'ring__caption', x: centre, y: centre + 16, 'text-anchor': 'middle' }, [caption]),
  ]);
}

/** Stroke patterns that separate donut segments without introducing colour. */
const SEGMENT_DASHES = [
  null,
  '7 3',
  '2 3',
  '9 2 2 2',
  '5 3',
  '1 4',
];

export function segmentDash(index) {
  return SEGMENT_DASHES[index % SEGMENT_DASHES.length];
}

/**
 * Allocation donut. Slices are { value, label }; segments are separated by a
 * small gap and by a distinct dash pattern per index.
 */
export function donut({ size = 180, slices = [], thickness = 14, gap = 0.006 }) {
  const radius = (size - thickness) / 2;
  const centre = size / 2;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  let cursor = 0;
  const arcs = slices.map((slice, index) => {
    const start = cursor + gap / 2;
    cursor += slice.value / total;
    const end = Math.max(start + 0.002, cursor - gap / 2);
    return svg('path', {
      class: 'donut__seg',
      d: arcPath(centre, centre, radius, start, end),
      'stroke-width': thickness,
      'stroke-dasharray': segmentDash(index),
      'data-index': index,
    });
  });
  return svg('svg', {
    class: 'donut',
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`,
    role: 'img',
    'aria-label': 'Allocation breakdown',
  }, [
    svg('circle', { class: 'donut__track', cx: centre, cy: centre, r: radius, 'stroke-width': thickness }),
    ...arcs,
  ]);
}

/**
 * Order-book depth: mirrored staircases around the mid price.
 * bids
 * are cumulative buy liquidity, asks cumulative sell liquidity.
 */
export function depthChart({ width, height, bids, asks, formatX }) {
  const padTop = 10;
  const padBottom = 20;
  const maxBid = bids.length ? bids[bids.length - 1].cumulative : 1;
  const maxAsk = asks.length ? asks[asks.length - 1].cumulative : 1;
  const peak = Math.max(maxBid, maxAsk) || 1;
  const half = width / 2;
  const plotHeight = height - padTop - padBottom;

  const stairs = (points, direction) => {
    const stepX = half / Math.max(1, points.length);
    let path = '';
    points.forEach((point, index) => {
      const x = direction > 0 ? half + stepX * index : half - stepX * index;
      const y = padTop + plotHeight - (point.cumulative / peak) * plotHeight;
      path += `${index === 0 ? 'M' : 'L'}${round(x)} ${round(y)} `;
      if (index < points.length - 1) {
        const nextX = direction > 0 ? half + stepX * (index + 1) : half - stepX * (index + 1);
        path += `L${round(nextX)} ${round(y)} `;
      }
    });
    return path;
  };

  const bidPath = stairs(bids, -1);
  const askPath = stairs(asks, 1);

  return svg('svg', {
    class: 'depth',
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': 'Order book depth',
  }, [
    svg('line', { class: 'depth__mid', x1: half, y1: padTop, x2: half, y2: padTop + plotHeight }),
    svg('path', { class: 'depth__area depth__area--bid', d: `${bidPath} L0 ${round(padTop + plotHeight)} Z` }),
    svg('path', { class: 'depth__area depth__area--ask', d: `${askPath} L${width} ${round(padTop + plotHeight)} Z` }),
    svg('path', { class: 'depth__line', d: bidPath }),
    svg('path', { class: 'depth__line', d: askPath }),
    svg('text', { class: 'chart__label', x: 2, y: height - 6, 'text-anchor': 'start' }, [formatX(bids)]),
    svg('text', { class: 'chart__label', x: width - 2, y: height - 6, 'text-anchor': 'end' }, [formatX(asks)]),
  ]);
}

/** Horizontal proportion bar used in holding and allocation lists. */
export function proportionBar(ratio, dashed = false) {
  const width = 100;
  return svg('svg', {
    class: 'prop',
    viewBox: `0 0 ${width} 6`,
    preserveAspectRatio: 'none',
    'aria-hidden': 'true',
  }, [
    svg('line', { class: 'prop__track', x1: 0, y1: 3, x2: width, y2: 3 }),
    svg('line', {
      class: 'prop__value',
      x1: 0, y1: 3,
      x2: round(clamp(ratio, 0, 1) * width),
      y2: 3,
      'stroke-dasharray': dashed ? '3 3' : null,
    }),
  ]);
}

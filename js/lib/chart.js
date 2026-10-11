/* SVG chart primitives drawn in the WIREFRAME idiom: one-pixel hairlines,
   zero-fill shapes filled with hatch patterns, no colour beyond the tokens.

   Every renderer takes a container element, measures it, and draws an SVG at
   exact pixel size so strokes stay hairline-crisp at any width. */

import { svg, mount } from './dom.js';
import { extent, ticks, linear, linePath, areaPath, round } from './scale.js';

let patternCounter = 0;

/** Hatch / dotted fill patterns. Free of colour so charts survive re-hue. */
const PATTERNS = {
  hatch: { size: 6, stroke: 1, rotate: 45, gap: 6 },
  hatchWide: { size: 12, stroke: 1, rotate: 45, gap: 12 },
  hatchBack: { size: 6, stroke: 1, rotate: -45, gap: 6 },
  dots: { size: 6, stroke: 0.8, rotate: 0, gap: 6, dot: true },
};

/**
 * Build a <defs> block with fresh ids so multiple charts can coexist.
 * Returns { node, ids } where ids keys are the pattern names above.
 */
export function buildDefs(palette) {
  const uid = `wf${(patternCounter += 1)}`;
  const ids = {};
  const children = [];
  for (const [key, spec] of Object.entries(PATTERNS)) {
    const id = `${uid}-${key}`;
    ids[key] = { id, spec };
    if (spec.dot) {
      children.push(
        svg('pattern', { id, width: spec.size, height: spec.size, patternUnits: 'userSpaceOnUse' }, [
          svg('circle', { cx: spec.size / 2, cy: spec.size / 2, r: spec.stroke / 2, fill: palette.line }),
        ]),
      );
    } else {
      children.push(
        svg('pattern', {
          id,
          width: spec.size,
          height: spec.size,
          patternUnits: 'userSpaceOnUse',
          patternTransform: `rotate(${spec.rotate})`,
        }, [
          svg('line', {
            x1: 0, y1: 0, x2: 0, y2: spec.size,
            stroke: palette.line, 'stroke-width': spec.stroke,
          }),
        ]),
      );
    }
  }
  return { node: svg('defs', {}, children), ids };
}

/** Fill reference string for a named hatch pattern. */
export function fillRef(defs, name) {
  return `url(#${defs.ids[name].id})`;
}

/**
 * Measure a container, draw into it and redraw whenever its width changes.
 * `draw(width, height)` must return an SVG node.
 */
export function responsive(container, draw, fallbackHeight = 160) {
  let lastWidth = 0;
  let lastHeight = 0;
  const render = () => {
    const width = Math.max(140, Math.round(container.clientWidth));
    const height = Math.max(48, Math.round(container.clientHeight || fallbackHeight));
    if (width === lastWidth && height === lastHeight) return;
    lastWidth = width;
    lastHeight = height;
    mount(container, draw(width, height));
  };
  render();
  if (window.ResizeObserver) {
    const observer = new ResizeObserver(render);
    observer.observe(container);
    return () => observer.disconnect();
  }
  window.addEventListener('resize', render);
  return () => window.removeEventListener('resize', render);
}

/** Horizontal grid rules at the given y positions. */
export function gridLines(width, ys) {
  return ys.map((y) => svg('line', {
    class: 'chart__grid',
    x1: 0, y1: round(y), x2: width, y2: round(y),
  }));
}

/** A line series with an optional hatched body underneath. */
export function seriesPath(points, { dashed = false } = {}) {
  return svg('path', {
    class: 'chart__line',
    d: linePath(points),
    'stroke-dasharray': dashed ? '3 3' : null,
  });
}

/** Marker at the final datapoint — the "you are here" vertex. */
export function endMarker(point) {
  const [x, y] = point;
  return svg('g', { class: 'chart__marker' }, [
    svg('line', { x1: round(x), y1: round(y) - 5, x2: round(x), y2: round(y) + 5 }),
    svg('line', { x1: round(x) - 5, y1: round(y), x2: round(x) + 5, y2: round(y) }),
    svg('circle', { cx: round(x), cy: round(y), r: 2.5 }),
  ]);
}

/** Axis label in the mono readout voice. */
export function axisLabel(x, y, text, anchor = 'start', cls = 'chart__label') {
  return svg('text', { class: cls, x: round(x), y: round(y), 'text-anchor': anchor }, [text]);
}

/** Area chart: grid, hatched body, hairline series, end marker, value axis. */
export function areaChart({ width, height, values, palette, defs, formatY, yTickCount = 4, pad = 0.12 }) {
  const plotTop = 10;
  const plotBottom = height - 18;
  const plotRight = width - 2;
  const domain = extent(values, pad);
  const y = linear(domain, [plotBottom, plotTop]);
  const x = linear([0, Math.max(1, values.length - 1)], [0, plotRight]);
  const points = values.map((value, index) => [x(index), y(value)]);
  const yTicks = ticks(domain[0], domain[1], yTickCount);

  const children = [
    ...gridLines(plotRight, yTicks.map((tick) => y(tick))),
    svg('path', {
      class: 'chart__area',
      d: areaPath(points, plotBottom),
      fill: fillRef(defs, 'hatch'),
    }),
    seriesPath(points),
    endMarker(points[points.length - 1]),
    ...yTicks.map((tick) => axisLabel(2, y(tick) - 4, formatY ? formatY(tick) : String(tick))),
    svg('line', { class: 'chart__axis', x1: 0, y1: plotBottom, x2: plotRight, y2: plotBottom }),
  ];
  return svg('svg', {
    class: 'chart__svg',
    width, height,
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': 'Price history',
  }, children);
}

/** Sparkline: a bare 24-point polyline, used inside table rows. */
export function sparkline({ width, height, values, dashed = false }) {
  const domain = extent(values, 0.1);
  const y = linear(domain, [height - 2, 2]);
  const x = linear([0, Math.max(1, values.length - 1)], [0, width]);
  const points = values.map((value, index) => [x(index), y(value)]);
  return svg('svg', {
    class: 'spark',
    width, height,
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: 'none',
    role: 'img',
    'aria-label': 'Trend',
  }, [seriesPath(points, { dashed })]);
}

/**
 * Hollow candlestick chart. Bodies are stroke-only rectangles — the theme's
 * "zero fill" rule applied literally; wicks are hairlines.
 */
export function candleChart({ width, height, candles, palette, defs, formatY, yTickCount = 4 }) {
  const plotTop = 12;
  const plotBottom = height - 18;
  const plotRight = width - 2;
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const domain = extent([...highs, ...lows], 0.08);
  const y = linear(domain, [plotBottom, plotTop]);
  const step = plotRight / candles.length;
  const bodyWidth = Math.max(2, Math.min(9, step * 0.62));
  const yTicks = ticks(domain[0], domain[1], yTickCount);

  const bodies = candles.map((candle, index) => {
    const cx = step * index + step / 2;
    const top = y(Math.max(candle.open, candle.close));
    const bottom = y(Math.min(candle.open, candle.close));
    const up = candle.close >= candle.open;
    const bodyHeight = Math.max(1, bottom - top);
    return svg('g', { class: up ? 'candle candle--up' : 'candle candle--down' }, [
      svg('line', { class: 'candle__wick', x1: round(cx), y1: round(y(candle.high)), x2: round(cx), y2: round(y(candle.low)) }),
      svg('rect', {
        class: 'candle__body',
        x: round(cx - bodyWidth / 2),
        y: round(top),
        width: round(bodyWidth),
        height: round(bodyHeight),
        fill: up ? 'none' : fillRef(defs, 'hatch'),
      }),
    ]);
  });

  return svg('svg', {
    class: 'chart__svg',
    width, height,
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': 'Candlestick chart',
  }, [
    ...gridLines(plotRight, yTicks.map((tick) => y(tick))),
    svg('line', { class: 'chart__axis', x1: 0, y1: plotBottom, x2: plotRight, y2: plotBottom }),
    ...bodies,
    ...yTicks.map((tick) => axisLabel(2, y(tick) - 4, formatY ? formatY(tick) : String(tick))),
  ]);
}

/** Vertical hairline bars, used for volume profile and depth. */
export function barSeries({ width, height, values, defs, dashed = false }) {
  const domain = extent(values, 0.05);
  const y = linear(domain, [height - 2, 2]);
  const step = width / Math.max(1, values.length);
  const barWidth = Math.max(1, Math.min(7, step * 0.55));
  return svg('svg', {
    class: 'chart__svg chart__svg--bars',
    width, height,
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: 'none',
    role: 'img',
    'aria-label': 'Volume',
  }, values.map((value, index) => svg('rect', {
    class: 'chart__bar',
    x: round(step * index + (step - barWidth) / 2),
    y: round(y(value)),
    width: round(barWidth),
    height: round(height - y(value) - 2),
    fill: index === values.length - 1 || dashed ? 'none' : fillRef(defs, 'hatch'),
  })));
}

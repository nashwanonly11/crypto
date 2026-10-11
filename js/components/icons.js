/* Line-art icon set. Every glyph is a stroked 24x24 path so it inherits the
   theme's ink through currentColor — no icon font, no emoji, no raster. */

import { svg } from '../lib/dom.js';

const PATHS = {
  dashboard: ['M3 13h8V3H3z', 'M13 21h8v-7h-8z', 'M13 10h8V3h-8z', 'M3 21h8v-5H3z'],
  markets: ['M3 20h18', 'M5 20v-6', 'M10 20V9', 'M15 20v-9', 'M20 20V5'],
  portfolio: ['M3 8h18v12H3z', 'M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2', 'M3 13h18'],
  bell: ['M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6', 'M10 20a2 2 0 0 0 4 0'],
  settings: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M4 12h2.2a6 6 0 0 1 .9-2.2L5.6 8.4l2.8-2.8 1.4 1.5A6 6 0 0 1 12 6.2V4h4v2.2a6 6 0 0 1 2.2.9l1.4-1.5 2.8 2.8-1.5 1.4a6 6 0 0 1 .9 2.2H22v4h-2.2a6 6 0 0 1-.9 2.2l1.5 1.4-2.8 2.8-1.4-1.5a6 6 0 0 1-2.2.9V20h-4v-2.2a6 6 0 0 1-2.2-.9l-1.4 1.5-2.8-2.8 1.5-1.4a6 6 0 0 1-.9-2.2H4z'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.3-4.3'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  chevronRight: ['M9 5l7 7-7 7'],
  chevronDown: ['M5 9l7 7 7-7'],
  chevronUp: ['M19 15l-7-7-7 7'],
  check: ['M4 12l6 6L20 6'],
  alert: ['M12 3l9 17H3z', 'M12 10v4', 'M12 17h.01'],
  star: ['M12 3l2.7 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17.3 6.5 20.2l1.1-6.2L3 9.6l6.3-.9z'],
  arrowUp: ['M12 19V5', 'M5 12l7-7 7 7'],
  arrowDown: ['M12 5v14', 'M5 12l7 7 7-7'],
  refresh: ['M20 11a8 8 0 1 0-2.3 5.7', 'M20 5v6h-6'],
  sliders: ['M4 7h10', 'M18 7h2', 'M4 17h6', 'M14 17h6', 'M14 4v6', 'M10 14v6'],
  layers: ['M12 3l9 5-9 5-9-5z', 'M3 13l9 5 9-5'],
  wallet: ['M3 7h15a3 3 0 0 1 3 3v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M3 7V6a2 2 0 0 1 2-2h10'],
  inbox: ['M3 12h5l2 3h4l2-3h5', 'M3 12l3-8h12l3 8v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
  user: ['M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21c0-4 3.6-6 8-6s8 2 8 6'],
  logout: ['M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3', 'M10 17l-5-5 5-5', 'M5 12h10'],
  target: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z', 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'],
  activity: ['M3 12h4l3 8 4-16 3 8h4'],
  book: ['M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z', 'M20 4h-3a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h4z'],
  flame: ['M12 3s5 4.5 5 9a5 5 0 0 1-10 0c0-1.6.7-2.8 1.6-3.8C10 6.6 12 3 12 3z'],
  snow: ['M12 3v18', 'M5 7l14 10', 'M19 7L5 17'],
  shield: ['M12 3l8 3v6c0 5-3.4 8.2-8 9-4.6-.8-8-4-8-9V6z'],
  filter: ['M4 5h16', 'M7 12h10', 'M10 19h4'],
  download: ['M12 4v10', 'M8 11l4 4 4-4', 'M4 20h16'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 11v5', 'M12 8h.01'],
};

const FILLED = new Set(['star', 'flame']);

/** Build an icon node. `name` must exist in PATHS. */
export function icon(name, { size = 16, className = 'icon', label = null } = {}) {
  const paths = PATHS[name] || PATHS.info;
  const node = svg('svg', {
    class: className,
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    'aria-hidden': label ? null : 'true',
    role: label ? 'img' : 'img',
    'aria-label': label,
  }, paths.map((d) => svg('path', {
    d,
    fill: FILLED.has(name) ? 'currentColor' : 'none',
  })));
  return node;
}

export const ICON_NAMES = Object.keys(PATHS);

/* Generated wireframe artwork.
   The theme's art direction calls for wireframe meshes, point clouds and vector
   terrain, so the imagery is drawn as vectors rather than sourced as photos.
   Every piece is deterministic and renders crisply at any size. */

import { svg, el, mount } from './dom.js';
import { mulberry32, hashSeed } from './prng.js';
import { round } from './scale.js';

const TAU = Math.PI * 2;

function polyline(points, cls = 'art__line') {
  return svg('polyline', {
    class: cls,
    points: points.map(([x, y]) => `${round(x)},${round(y)}`).join(' '),
  });
}

function polygon(points, cls = 'art__line') {
  return svg('polygon', {
    class: cls,
    points: points.map(([x, y]) => `${round(x)},${round(y)}`).join(' '),
  });
}

/** Receding terrain grid with a height field: the theme's vector terrain. */
export function meshTerrain({ width = 800, height = 500, seed = 'terrain', cols = 26, rows = 16 } = {}) {
  const random = mulberry32(hashSeed(seed));
  const horizon = height * 0.34;
  const phaseA = random() * TAU;
  const phaseB = random() * TAU;
  const jitter = Array.from({ length: (cols + 1) * (rows + 1) }, () => random());

  const project = (col, row) => {
    const depth = row / (rows - 1);
    const scale = 0.14 + depth * 0.86;
    const x = width / 2 + (col / (cols - 1) - 0.5) * width * scale * 1.7;
    const y = horizon + (height - horizon) * depth ** 1.75;
    const noise = jitter[row * (cols + 1) + col];
    const lift = (Math.sin(col * 0.42 + phaseA) * 0.5
      + Math.sin(col * 0.17 + row * 0.31 + phaseB) * 0.42
      + noise * 0.16) * height * 0.11 * scale;
    return [x, y - lift];
  };

  const lines = [];
  for (let row = 0; row !== rows; row += 1) {
    const points = [];
    for (let col = 0; col !== cols; col += 1) points.push(project(col, row));
    lines.push(polyline(points, row % 4 === 0 ? 'art__line' : 'art__line art__line--faint'));
  }
  for (let col = 0; col !== cols; col += 1) {
    const points = [];
    for (let row = 0; row !== rows; row += 1) points.push(project(col, row));
    lines.push(polyline(points, col % 5 === 0 ? 'art__line' : 'art__line art__line--faint'));
  }

  return svg('svg', {
    class: 'art',
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: 'xMidYMid slice',
    role: 'img',
    'aria-label': 'Wireframe terrain mesh',
  }, [
    svg('line', { class: 'art__line art__line--faint', x1: 0, y1: round(horizon), x2: width, y2: round(horizon) }),
    ...lines,
  ]);
}
/** Concentric rotated polygons funnelling to a vanishing point: vector tunnel. */
export function vectorTunnel({ width = 800, height = 500, seed = 'tunnel', rings = 13, sides = 8 } = {}) {
  const random = mulberry32(hashSeed(seed));
  const cx = width * (0.42 + random() * 0.16);
  const cy = height * (0.44 + random() * 0.12);
  const maxRadius = Math.hypot(width, height) * 0.6;
  const spin = random() * TAU;
  const noise = Array.from({ length: (rings + 1) * sides }, () => random());

  const ringPoints = (index) => {
    const t = index / (rings - 1);
    const radius = maxRadius * t ** 1.9;
    const rotation = spin + t * 1.5;
    return Array.from({ length: sides }, (unused, vertex) => {
      const angle = rotation + (vertex / sides) * TAU;
      const wobble = 0.86 + noise[index * sides + vertex] * 0.24;
      const shape = wobble * (0.94 + Math.sin(angle * 3 + t * 4) * 0.06);
      return [cx + Math.cos(angle) * radius * shape, cy + Math.sin(angle) * radius * shape * 0.72];
    });
  };

  const ringList = Array.from({ length: rings }, (unused, index) => ringPoints(index));
  const shapes = ringList.map((points, index) => {
    let cls = 'art__line art__line--faint';
    if (index === 0) cls = 'art__line art__line--accent';
    else if (index === 1 || index === 2) cls = 'art__line';
    return polygon(points, cls);
  });

  for (let vertex = 0; vertex !== sides; vertex += 1) {
    const spine = ringList.map((points) => points[vertex]);
    shapes.push(polyline(spine, 'art__line art__line--faint'));
  }

  return svg('svg', {
    class: 'art',
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: 'xMidYMid slice',
    role: 'img',
    'aria-label': 'Vector tunnel',
  }, shapes);
}

/** Orthographic point cloud with great-circle wires: a data sphere. */
export function pointCloud({ width = 800, height = 500, seed = 'cloud', latitudeBands = 12, longitudeBands = 24 } = {}) {
  const random = mulberry32(hashSeed(seed));
  const radius = Math.min(width, height) * 0.36;
  const cx = width / 2;
  const cy = height / 2;
  const tilt = 0.38 + random() * 0.16;

  const project = (latitude, longitude) => {
    const x = Math.cos(latitude) * Math.cos(longitude);
    const y = Math.sin(latitude);
    const z = Math.cos(latitude) * Math.sin(longitude);
    const tiltedY = y * Math.cos(tilt) - z * Math.sin(tilt);
    const tiltedZ = y * Math.sin(tilt) + z * Math.cos(tilt);
    return { x: cx + x * radius, y: cy - tiltedY * radius, z: tiltedZ };
  };

  const dots = [];
  const wires = [];

  for (let band = 0; band !== latitudeBands + 1; band += 1) {
    const latitude = (band / latitudeBands) * Math.PI - Math.PI / 2;
    const circle = [];
    for (let step = 0; step !== longitudeBands + 1; step += 1) {
      const longitude = (step / longitudeBands) * TAU;
      const point = project(latitude, longitude);
      circle.push([point.x, point.y]);
      if (step % 2 === 0 && point.z > -0.15) {
        const leading = point.z > 0.45;
        dots.push(svg('circle', {
          class: leading ? 'art__dot art__dot--accent' : 'art__dot',
          cx: round(point.x),
          cy: round(point.y),
          r: leading ? 1.7 : 1.1,
          opacity: round(0.35 + (point.z + 1) * 0.32),
        }));
      }
    }
    wires.push(polyline(circle, band % 3 === 0 ? 'art__line' : 'art__line art__line--faint'));
  }

  for (let spoke = 0; spoke !== longitudeBands; spoke += 4) {
    const longitude = (spoke / longitudeBands) * TAU;
    const meridian = [];
    for (let step = 0; step !== latitudeBands + 1; step += 1) {
      const latitude = (step / latitudeBands) * Math.PI - Math.PI / 2;
      const point = project(latitude, longitude);
      meridian.push([point.x, point.y]);
    }
    wires.push(polyline(meridian, 'art__line art__line--faint'));
  }

  return svg('svg', {
    class: 'art',
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: 'xMidYMid slice',
    role: 'img',
    'aria-label': 'Point cloud sphere',
  }, [...wires, ...dots]);
}

/** Isometric stack of wireframe plates: a three-dimensional bar readout. */
export function isoStack({ width = 800, height = 500, seed = 'stack', columns = 9 } = {}) {
  const random = mulberry32(hashSeed(seed));
  const unit = width / (columns + 3);
  const originX = width * 0.5;
  const originY = height * 0.74;
  const tiltX = 0.52;
  const tiltY = 0.26;
  const depth = unit * 0.62;

  const shapes = [];
  for (let column = 0; column !== columns; column += 1) {
    const ratio = 0.22 + (Math.sin(column * 0.7 + random() * 2) + 1) * 0.26;
    const barHeight = height * 0.5 * ratio;
    const x = originX + (column - columns / 2) * unit * 1.25;
    const baseY = originY - column * unit * tiltY;
    const corner = (dx, dy, dz) => [x + dx, baseY + dy - dz * tiltX];

    const top = [
      corner(-unit * 0.4, -barHeight, depth),
      corner(unit * 0.4, -barHeight, depth),
      corner(unit * 0.4, -barHeight, 0),
      corner(-unit * 0.4, -barHeight, 0),
    ];
    const left = [top[3], top[0], corner(-unit * 0.4, 0, depth), corner(-unit * 0.4, 0, 0)];
    const right = [top[1], top[2], corner(unit * 0.4, 0, 0), corner(unit * 0.4, 0, depth)];
    const accent = column === Math.floor(columns * 0.66) ? ' art__line--accent' : '';

    shapes.push(polygon(top, `art__line${accent}`));
    shapes.push(polygon(left, 'art__line art__line--faint'));
    shapes.push(polygon(right, `art__line${accent}`));
  }

  return svg('svg', {
    class: 'art',
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: 'xMidYMid slice',
    role: 'img',
    'aria-label': 'Isometric wireframe stack',
  }, shapes);
}

/**
 * Wrap artwork in the theme's image treatment: frame, radius, filter, tilt and
 * the accent overlay layer. Every image in the pack carries this treatment.
 */
export function artFrame(art, { ratio = 'var(--tp-img-ar)', className = '' } = {}) {
  const frame = el('div', { class: `art-frame ${className}`.trim() }, [art]);
  frame.style.aspectRatio = ratio;
  frame.append(el('span', { class: 'art-frame__overlay', 'aria-hidden': 'true' }));
  return frame;
}

/** Swap the art inside an existing frame without rebuilding the frame. */
export function setArt(frame, art) {
  const overlay = frame.querySelector('.art-frame__overlay');
  mount(frame, overlay ? [art, overlay] : [art]);
  return frame;
}

// Helpers for vector-monitor games: bright glowing lines on black.
export function vline(c, pts, { color = '#e8f6ff', width = 1.3, close = true, glow = 6 } = {}) {
  c.save();
  c.strokeStyle = color; c.lineWidth = width; c.shadowColor = color; c.shadowBlur = glow;
  c.lineJoin = 'round';
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  if (close) c.closePath();
  c.stroke();
  c.restore();
}
export const rot = (pts, a, x, y, s = 1) => pts.map(([px, py]) => [x + (px * Math.cos(a) - py * Math.sin(a)) * s, y + (px * Math.sin(a) + py * Math.cos(a)) * s]);

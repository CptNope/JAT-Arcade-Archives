// Boot: choose the 3D museum or the 2D arcade. This file and flat.js never import three.js, so the
// games stay playable when WebGL is missing, the 3D engine can't download, or the visitor prefers 2D.
import { startFlat } from './flat.js';

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}
let prefers2D = location.hash === '#2d' || window.JAT_ARCADE_CONFIG?.mode === '2d';
try { prefers2D ||= sessionStorage.getItem('jat-flat') === '1'; } catch { /* storage blocked */ }

window.__jatBooted = true;
if (prefers2D) startFlat({ reason: 'user' });
else if (!webglOK()) startFlat({ reason: 'no-webgl' });
else {
  import('./museum.js').catch((err) => {
    console.error('3D museum failed to load:', err);
    startFlat({ reason: 'load-failed' });
  });
}

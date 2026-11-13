// Screen material: shows a game canvas with a CRT look (curvature, scanlines, glow, vignette)
// or an LCD look (pixel grid, no glow) for handhelds.
import * as THREE from 'three';

const vert = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const frag = /* glsl */`
  uniform sampler2D map;
  uniform vec2 res;        // game resolution in pixels
  uniform float time;
  uniform float curve;     // 0 = flat
  uniform float lcd;       // 1 = LCD mode
  uniform float bright;
  varying vec2 vUv;

  vec2 bend(vec2 uv) {
    uv = uv * 2.0 - 1.0;
    vec2 o = abs(uv.yx) * curve;
    uv = uv + uv * o * o;
    return uv * 0.5 + 0.5;
  }
  void main() {
    vec2 uv = curve > 0.0 ? bend(vUv) : vUv;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
    vec3 col;
    if (lcd > 1.5) {
      col = texture2D(map, uv).rgb;            // plain panel (lamps, no tube)
    } else if (lcd > 0.5) {
      col = texture2D(map, uv).rgb;
      vec2 cell = fract(uv * res);
      float grid = smoothstep(0.0, 0.12, cell.x) * smoothstep(0.0, 0.12, cell.y);
      col *= mix(0.82, 1.0, grid);
    } else {
      // slight RGB split + soft horizontal bleed
      float px = 1.0 / res.x;
      col.r = texture2D(map, uv + vec2(px * 0.6, 0.0)).r;
      col.g = texture2D(map, uv).g;
      col.b = texture2D(map, uv - vec2(px * 0.6, 0.0)).b;
      col += texture2D(map, uv + vec2(px, 0.0)).rgb * 0.15 + texture2D(map, uv - vec2(px, 0.0)).rgb * 0.15;
      col /= 1.3;
      float scan = 0.72 + 0.28 * sin(uv.y * res.y * 3.14159 * 2.0);
      col *= scan;
      // aperture-grille stripes
      float m = mod(gl_FragCoord.x, 3.0);
      col *= vec3(m < 1.0 ? 1.08 : 0.94, m >= 1.0 && m < 2.0 ? 1.08 : 0.94, m >= 2.0 ? 1.08 : 0.94);
      col *= 0.97 + 0.03 * sin(time * 60.0);
      vec2 v = uv * (1.0 - uv.yx);
      col *= pow(v.x * v.y * 18.0, 0.22);
      col += vec3(0.012, 0.016, 0.02); // phosphor floor: screens are never pure black
    }
    gl_FragColor = vec4(col * bright, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createScreen(game, width, { lcd = false, plain = false, curve = 0.11, bright = 1.6 } = {}) {
  const tex = new THREE.CanvasTexture(game.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: tex },
      res: { value: new THREE.Vector2(game.w, game.h) },
      time: { value: 0 },
      curve: { value: lcd || plain ? 0 : curve },
      lcd: { value: plain ? 2 : lcd ? 1 : 0 },
      bright: { value: lcd ? 1.0 : plain ? 0.95 : bright },
    },
    vertexShader: vert,
    fragmentShader: frag,
    toneMapped: false,
  });
  const height = width * (game.h / game.w);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  mesh.userData.texture = tex;
  mesh.userData.size = [width, height];
  return mesh;
}

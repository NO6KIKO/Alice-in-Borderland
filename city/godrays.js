// Screen-space sun shafts (GPU Gems 3, ch. 13 style): radial blur toward the sun of the open-sky pixels,
// added back over the HDR frame before bloom. Sky is found by depth (nothing drawn there → far plane), so
// sunlit walls don't streak. Only when the sun is in front of the camera; off at night.
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const N = 48;
const GodRayShader = {
  uniforms: {
    tDiffuse: { value: null }, tSky: { value: null }, sun: { value: new THREE.Vector2(.5, .5) }, strength: { value: 0 },
    tint: { value: new THREE.Color(1, .9, .75) }, aspect: { value: 1 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse, tSky; uniform vec2 sun; uniform float strength, aspect; uniform vec3 tint; varying vec2 vUv;
    void main(){
      vec4 base = texture2D(tDiffuse, vUv);
      vec2 delta = (vUv - sun) * (.9 / float(${N}));
      float jit = fract(sin(dot(vUv * 913.7, vec2(12.9898, 78.233))) * 43758.5453);   // dither the march (hides banding)
      vec2 uv = vUv - delta * jit; float w = 1.; vec3 acc = vec3(0.);
      for (int i = 0; i < ${N}; i++) {
        uv -= delta;
        vec2 c = clamp(uv, .001, .999);
        float sky = texture2D(tSky, c).r;
        acc += min(texture2D(tDiffuse, c).rgb, vec3(4.)) * sky * w;
        w *= .96;
      }
      vec2 d = (vUv - sun) * vec2(aspect, 1.);
      float fall = 1. / (1. + dot(d, d) * 5.);                       // strongest near the sun
      gl_FragColor = vec4(base.rgb + acc / float(${N}) * tint * strength * fall, base.a);
    }`,
};

// right after the RenderPass: turn its depth into a half-res sky mask in a target of our own (sampling the
// composer's depth texture later would feed back into the buffer being drawn once the passes swap)
class SkyMask extends Pass {
  constructor() {
    super(); this.needsSwap = false; this.rt = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: false });
    this.quad = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: { tDepth: { value: null } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D tDepth; varying vec2 vUv; void main(){ gl_FragColor = vec4(step(.99999, texture2D(tDepth, vUv).x), 0., 0., 1.); }' }));
  }
  setSize(w, h) { this.rt.setSize(Math.max(2, w >> 1), Math.max(2, h >> 1)); }
  render(renderer, writeBuffer, readBuffer) {
    this.quad.material.uniforms.tDepth.value = readBuffer.depthTexture;
    renderer.setRenderTarget(this.rt); this.quad.render(renderer);
  }
}

export function createGodRays(composer, index) {
  for (const rt of [composer.renderTarget1, composer.renderTarget2]) {   // scene depth alongside colour
    rt.depthTexture = new THREE.DepthTexture(rt.width, rt.height); rt.depthTexture.type = THREE.UnsignedIntType; rt.depthBuffer = true; rt.dispose();
  }
  const pass = new ShaderPass(GodRayShader), u = pass.uniforms;
  const mask = new SkyMask(); u.tSky.value = mask.rt.texture; mask.setSize(composer._width * composer._pixelRatio, composer._height * composer._pixelRatio);
  composer.insertPass(pass, index); composer.insertPass(mask, 1);   // mask right after the RenderPass
  const _p = new THREE.Vector3(), _f = new THREE.Vector3();
  let base = 0;
  return {
    pass,
    setDay(day, dusk) { base = dusk ? 1.4 : day ? .9 : 0; u.tint.value.set(dusk ? 0xffb878 : 0xfff2dc); },
    update(camera, sunDir, w, h) {
      u.aspect.value = w / h;
      const facing = camera.getWorldDirection(_f).dot(sunDir);
      if (!base || facing <= 0) { pass.enabled = mask.enabled = false; return; }
      _p.copy(camera.position).addScaledVector(sunDir, 1000).project(camera);
      // fade out as the sun leaves the frame
      const edge = Math.max(Math.abs(_p.x), Math.abs(_p.y)), k = THREE.MathUtils.clamp(1.7 - edge, 0, 1) * Math.min(1, facing * 3);
      u.sun.value.set(_p.x * .5 + .5, _p.y * .5 + .5); u.strength.value = base * k; pass.enabled = mask.enabled = k > 0;
    },
  };
}

// Film look after the show's stills: teal shadows / amber highlights split-tone, lowered saturation, S-curve
// contrast, soft vignette, fine animated grain, optional 2.39:1 letterbox. Runs after OutputPass (display space).
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, time: { value: 0 }, aspect: { value: 1 },
    shadowTint: { value: new THREE.Color(0x0e3a44) }, highTint: { value: new THREE.Color(0xffb36b) },
    split: { value: .32 }, sat: { value: .82 }, contrast: { value: .22 }, lift: { value: .015 },
    vignette: { value: .42 }, grain: { value: .035 }, bars: { value: 0 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time, aspect, split, sat, contrast, lift, vignette, grain, bars;
    uniform vec3 shadowTint, highTint; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + time * 43.17) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(.2126, .7152, .0722));
      c = mix(vec3(l), c, sat);                                             // pull saturation down
      vec3 tint = mix(shadowTint, highTint, smoothstep(.05, .75, l));       // split-tone by luminance
      c = mix(c, c * (.55 + tint * 1.2), split);
      c = c + lift * (1. - c);                                              // milky blacks
      c = mix(c, c * c * (3. - 2. * c), contrast);                          // gentle S-curve
      vec2 d = (vUv - .5) * vec2(aspect, 1.); c *= 1. - vignette * smoothstep(.35, 1.05, length(d));
      c += (hash(vUv * 1000.) - .5) * grain;
      if (bars > 0.) { float h = .5 - .5 * aspect / 2.39; if (vUv.y < h || vUv.y > 1. - h) c = vec3(0.); }
      gl_FragColor = vec4(c, 1.);
    }`,
};

export function createGrade(composer) {
  const pass = new ShaderPass(GradeShader); composer.addPass(pass);
  const u = pass.uniforms;
  const looks = {   // day: hazy, cool, washed highlights; night: deep teal shadows with warm practicals
    day: { shadowTint: 0x1f4a58, highTint: 0xf4ece0, split: .2, sat: .78, contrast: .3, lift: .0, vignette: .34 },
    dusk: { shadowTint: 0x153c52, highTint: 0xffb46a, split: .34, sat: .9, contrast: .26, lift: .01, vignette: .42 },
    night: { shadowTint: 0x06303c, highTint: 0xffa860, split: .4, sat: .85, contrast: .28, lift: .012, vignette: .5 },
  };
  return {
    pass,
    setDay(day, dusk) { const L = looks[dusk ? 'dusk' : day ? 'day' : 'night']; for (const [k, v] of Object.entries(L)) { if (u[k].value?.isColor) u[k].value.set(v); else u[k].value = v; } },
    setBars(on) { u.bars.value = on ? 1 : 0; },
    update(t, w, h) { u.time.value = t % 100; u.aspect.value = w / h; },
  };
}

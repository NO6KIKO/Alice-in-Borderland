// Height fog: the usual exp² distance haze plus an analytic ground layer (density falls off with height),
// so streets get aerial depth and low mist while views from the air stay clear.
// Rides on THREE.Fog's uniforms: fogNear = exp² density, fogFar = ground-layer density per metre at y = 0.
import * as THREE from 'three';

const FALLOFF = 0.035;   // 1/m — the layer thins by e every ~29 m of height

export class HeightFog extends THREE.Fog {
  constructor(color, density, height) { super(color, density, height); }
  get density() { return this.near; } set density(v) { this.near = v; }
  get height() { return this.far; } set height(v) { this.far = v; }
}

export function installHeightFog() {
  const C = THREE.ShaderChunk;
  C.fog_pars_vertex = '#ifdef USE_FOG\n\tvarying float vFogDepth;\n\tvarying vec3 vFogWorld;\n#endif';
  // world position from the view-space one (view matrix is rigid: inverse = transpose of its rotation)
  C.fog_vertex = '#ifdef USE_FOG\n\tvFogDepth = - mvPosition.z;\n\tvFogWorld = transpose( mat3( viewMatrix ) ) * ( mvPosition.xyz - viewMatrix[ 3 ].xyz );\n#endif';
  C.fog_pars_fragment = `#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	varying vec3 vFogWorld;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`;
  C.fog_fragment = `#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		vec3 fRay = vFogWorld - cameraPosition; float fDist = length( fRay );
		float fY = fRay.y * ${FALLOFF.toFixed(4)};
		float fG = abs( fY ) > 1e-3 ? ( 1.0 - exp( - fY ) ) / fY : 1.0 - 0.5 * fY;
		float fH = fogFar * exp( - clamp( cameraPosition.y, -50.0, 2000.0 ) * ${FALLOFF.toFixed(4)} ) * fDist * fG;
		float fogFactor = 1.0 - exp( - fogNear * fogNear * fDist * fDist - fH );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`;
}

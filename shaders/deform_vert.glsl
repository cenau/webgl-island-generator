#ifdef GL_ES
precision mediump float;
#endif


#pragma glslify: snoise3 = require(glsl-noise/simplex/3d) 
#pragma glslify: snoise2 = require(glsl-noise/simplex/2d) 

uniform vec3 colour;
uniform float alpha;
uniform sampler2D tDiffuse; 
uniform float deformAmount;


varying vec3 vNorm;
varying vec2 vUv;
varying float deform;


void main() {
  vUv = uv;
  
  vec4 influence = texture2D(tDiffuse,vUv); 
  deform = influence.x;
  deform = (deform * 2.) - 1.;
  vec3 newPosition = vec3(position.x,position.y, deform * deformAmount); 
  gl_Position = projectionMatrix *
              modelViewMatrix *
              vec4(newPosition, 1.0);


}

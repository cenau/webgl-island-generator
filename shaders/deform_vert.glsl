#ifdef GL_ES
precision mediump float;
#endif


#pragma glslify: snoise3 = require(glsl-noise/simplex/3d) 
#pragma glslify: snoise2 = require(glsl-noise/simplex/2d) 

uniform float lacunarity;
uniform float gain;
uniform float fbmx;
uniform float fbmy;
uniform float deformAmount;


varying vec3 vNorm;
varying vec2 vUv;
varying float deform;


  #define OCTAVES 8
  #
 
// from https://thebookofshaders.com/13/
float fbm ( in vec2 _st) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(10.0);
    // Rotate to reduce axial bias
    mat2 rot = mat2(cos(0.5), sin(0.5), 
                    -sin(0.5), cos(0.50));
    for (int i = 0; i < OCTAVES; ++i) {
        v += a * snoise2(_st);
        _st = rot * _st * lacunarity + shift;
        a *= gain;
    }
    return v;
}


void main() {
  vUv = uv;
  vNorm = position.xyz;
  vec3 worldPos = vec4(modelMatrix * vec4(position,1.0)).xyz;


vec2 q = vec2(0.);
    q.x = fbm( vUv + 0.00);
    q.y = fbm( vUv + vec2(1.0));
 
    vec2 r = vec2(0.);
    r.x = fbm( vUv + 1.0*q + vec2(1.7,9.2)+ fbmx );
    r.y = fbm( vUv + 1.0*q + vec2(8.3,2.8)+ fbmy );

    deform = fbm(worldPos.yy + sin(worldPos.xz/1000.) + vUv+r);

  vec3 newPosition = vec3(position.x,position.y, deform * deformAmount); 
  gl_Position = projectionMatrix *
              modelViewMatrix *
              vec4(newPosition, 1.0);


}


#ifdef GL_ES
precision mediump float;
#endif


uniform float iGlobalTime;
uniform float lacunarity;
uniform float gain;
uniform float fbmx;
uniform float fbmy;
uniform float deformAmount;
uniform float seaLevel;
varying vec2 vUv;
varying float deform;



// from https://thebookofshaders.com/13/
// Based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float random (in vec2 _st) { 
    return fract(sin(dot(_st.xy,
                         vec2(12.9898,78.233)))* 
        43758.5453123);
}


float noise (in vec2 _st) {
    vec2 i = floor(_st);
    vec2 f = fract(_st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) + 
            (c - a)* u.y * (1.0 - u.x) + 
            (d - b) * u.x * u.y;
}

  #define OCTAVES 12
  #
 
// from https://thebookofshaders.com/13/
float fbm ( in vec2 _st) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    // Rotate to reduce axial bias
    mat2 rot = mat2(cos(0.5), sin(0.5), 
                    -sin(0.5), cos(0.50));
    for (int i = 0; i < OCTAVES; ++i) {
        v += a * noise(_st);
        _st = rot * _st * lacunarity + shift;
	a *= gain;
    }
    return v;
}


void main() {
  vec2 st = uv;

vec2 q = vec2(0.);
    q.x = fbm( st + 0.00);
    q.y = fbm( st + vec2(1.0));
 
    vec2 r = vec2(0.);
    r.x = fbm( st + 1.*q + vec2(1.7,9.2)+ 0.15 * sin(iGlobalTime * fbmx) );
    r.y = fbm( st + 1.*q + vec2(8.3,2.8)+ 0.26 * cos(iGlobalTime * fbmy));
    float deform = fbm(st + r);
  vec3 newPosition = vec3(position.x,position.y, seaLevel + deform * deformAmount); 
  gl_Position = projectionMatrix *
              modelViewMatrix *
              vec4(newPosition, 1.0);
}


#define FOG_DENSITY 0.025

varying float deform;
uniform vec3 colour;
uniform float alpha;

#pragma glslify: fog_exp = require(glsl-fog/exp) 
#pragma glslify: fog_exp2 = require(glsl-fog/exp2) 

void main(){
	vec3 colour = colour/255.;
	float fogDistance = gl_FragCoord.z / gl_FragCoord.w;
	float fogAmount = fog_exp2(fogDistance, FOG_DENSITY);
	vec4 fogColor = vec4(1.,1.,1.,1.); // white 

	gl_FragColor = vec4(mix(vec4(colour, alpha),fogColor,fogAmount));
}

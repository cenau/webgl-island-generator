uniform vec2 p0;
uniform vec2 p1;


float smoothen(float d1, float d2) {
    float k = 1.5;
    return -log(exp(-k * d1) + exp(-k * d2)) / k;
}

void main(){
	vec2 st = gl_FragCoord.xy / resolution.xy;
    float d = smoothen(distance(st, p0) * 3.0, distance(st, p1) * 5.0);
        vec3 colour = vec3(smoothstep(0.0, 0.8, d));	
        colour += smoothstep(0.2, 1., d * .55);	
	colour = 1.0-colour;
	gl_FragColor = vec4(colour,1.0);
}


uniform float scale;
uniform vec2 gridPos;

vec2 random2( vec2 p ) {
    return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
}

void main() {
    vec2 st = gl_FragCoord.xy / resolution.xy;
    vec3 color = vec3(.0);
    
    // Scale 
    st *= scale;
    
    // Tile the space
    vec2 i_st = floor(st);
    vec2 f_st = fract(st);

    float m_dist = 10.;  // minimun distance
    vec2 m_point;        // minimum point
    
    for (int j=-1; j<=1; j++ ) {
        for (int i=-1; i<=1; i++ ) {
            vec2 neighbor = vec2(float(i),float(j));
            vec2 point = random2(gridPos + i_st + neighbor);
            point = 0.5 + 0.5*sin(6.2831*point);
            vec2 diff = neighbor + point - f_st;
            float dist = length(diff);

            if( dist < m_dist ) {
                m_dist = dist;
                m_point = point;
            }
        }
    }

    // Assign a color using the closest point position
    color = vec3(0.5);
    //color += dot(m_point,vec2(0.3,0.6)) * 0.0;
    
    // Add distance field to closest point center 
    color+= pow(m_dist,4.);
    // Show isolines
    //color -= abs(sin(40.0*m_dist))*0.07;
    
    // Draw cell center
    //color += 1.-step(.05, m_dist);
    
    // Draw grid
    //color.r += step(.98, f_st.x) + step(.98, f_st.y);
    
    gl_FragColor = vec4(color,1.0);
}






//void main(){
//	vec2 uv = gl_FragCoord.xy / resolution.xy;
//	vec4 tmpPos = texture2D( texturePosition, uv );
//	vec3 position = tmpPos.xyz;
//	gl_FragColor = vec4(1.,0.5,1.,1.);
//}

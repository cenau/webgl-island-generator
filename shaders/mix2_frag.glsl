uniform float mixAmount;
uniform float mixAmount2;

void main() {

    vec2 st = gl_FragCoord.xy / resolution.xy;
    vec4 input1 = texture2D(textureVorHeight,st); 
    vec4 input2 = texture2D(textureFbmHeight,st);
    vec4 input3 = texture2D(textureIslandHeight,st);
    input1 = input1 * pow(vec4(mixAmount2),input3);  
     
    //mix(input1,input3,vec4(mixAmount2));
    
    vec4 colour = mix(input2,input1,vec4(mixAmount));
    gl_FragColor =  vec4(colour);
} 

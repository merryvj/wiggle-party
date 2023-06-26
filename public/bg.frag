// Author:
// Title:

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 point1;
uniform vec2 point2;
uniform float radius1;
uniform float radius2;

float rand2D(in vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec2 random2(vec2 st){
    st = vec2( dot(st,vec2(127.1,311.7)),
              dot(st,vec2(269.5,183.3)) );
    return -1.0 + 2.0*fract(sin(st)*43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    vec2 u = f*f*(3.0-2.0*f);

    return mix( mix( dot( random2(i + vec2(0.0,0.0) ), f - vec2(0.0,0.0) ),
                     dot( random2(i + vec2(1.0,0.0) ), f - vec2(1.0,0.0) ), u.x),
                mix( dot( random2(i + vec2(0.0,1.0) ), f - vec2(0.0,1.0) ),
                     dot( random2(i + vec2(1.0,1.0) ), f - vec2(1.0,1.0) ), u.x), u.y);
}



float body(vec2 st, vec2 p, float r, float blur) {
    float d = length(st-p);
    float c = smoothstep(r, r - blur, d);
    return c;
}

vec3 cosPalette( float t , vec3 brightness, vec3 contrast, vec3 osc, vec3 phase)
{
    return brightness + contrast*cos( 6.28318*(osc*t+phase) );
}

void main() {
    vec2 st = gl_FragCoord.xy/u_resolution.xy;
    st.x *= u_resolution.x/u_resolution.y;

    vec2 p1 = point1;
    vec2 p2 = point2;

    p1 *= vec2(3.0);
    p2 *= vec2(3.0);

    p1.x *= u_resolution.x/u_resolution.y;
    p2.x *= u_resolution.x/u_resolution.y;

    vec3 col = cosPalette(st.x * st.y * (0.3 + cos(u_time * 0.1)), vec3(0.9,0.9,0.9),vec3(0.5,0.5,0.5),vec3(1.0,1.0,1.0),vec3(0.0,0.33,0.67) );
    vec3 color = vec3(0.);
    color += body(st, p1, radius1 + rand2D(st) * 0.1, 0.2) * col;
    color += body(st, p2, radius2 + rand2D(st) * 0.1 , 0.2) * col;
    
    gl_FragColor = vec4(color,1.0);
}
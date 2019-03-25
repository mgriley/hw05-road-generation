#version 300 es
precision highp float;

uniform bvec3 u_bin;
uniform vec3 u_fin;

uniform vec3 u_Eye, u_Ref, u_Up;
uniform vec2 u_Dimensions;
uniform float u_Time;

in vec2 fs_Pos;
out vec4 out_Col;

void main() {

  vec3 col = vec3(0.0,0.2,0.0);

  out_Col = vec4(col, 1.0);
}

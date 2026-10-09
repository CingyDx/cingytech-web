// Analytic ribbon surface and studio illumination. Rasterized WebGL, not raytracing.
export const vertexShader = `
attribute vec3 aParam;
uniform float uTime;
uniform float uMode;
uniform float uRadius;
varying vec3 vNormal;
varying vec3 vView;
varying float vLane;
varying float vAngle;
const float PI=3.14159265359;
vec3 center(float t,float mode){
  float r=1.18+.30*cos(3.*t);
  vec3 web=vec3(r*cos(2.*t),r*sin(2.*t),.60*sin(3.*t));
  vec3 app=vec3(1.52*cos(t),1.6*sin(t),.48*sin(2.*t));
  vec3 autoShape=vec3(1.65*cos(t),1.18*sin(t),.7*sin(t*3.));
  return mode<1.?mix(web,app,mode):mix(app,autoShape,mode-1.);
}
vec3 surface(float t,float lane){
  float wave=uTime*.16;
  vec3 c=center(t,uMode);
  vec3 tangent=normalize(center(t+.003,uMode)-center(t-.003,uMode));
  vec3 radial=normalize(vec3(c.xy,.05));
  vec3 binormal=normalize(cross(tangent,radial));
  vec3 normal=normalize(cross(binormal,tangent));
  float twist=lane*2.*PI+2.*t+.25*sin(t*3.+wave)+uMode*.4;
  float radius=.36+.035*sin(t*3.-wave);
  vec3 across=normal*cos(twist)+binormal*sin(twist);
  vec3 outp=c+across*radius;
  return outp;
}
void main(){
  float t=aParam.x*2.*PI;
  float lane=aParam.y;
  vec3 pos=surface(t,lane);
  vec3 along=surface(t+.002,lane)-surface(t-.002,lane);
  vec3 across=surface(t,lane+.002)-surface(t,lane-.002);
  vec3 face=normalize(cross(along,across));
  vec3 binormal=normalize(cross(face,normalize(along)));
  vec3 n=normalize(face*cos(aParam.z)+binormal*sin(aParam.z));
  pos+=n*uRadius;
  vec4 mv=modelViewMatrix*vec4(pos,1.);
  vView=-mv.xyz;vNormal=normalize(normalMatrix*n);
  vLane=aParam.y;vAngle=t;
  gl_Position=projectionMatrix*mv;
}`;

export const fragmentShader = `
uniform float uTime;
varying vec3 vNormal;
varying vec3 vView;
varying float vLane;
varying float vAngle;
float panel(vec3 r,vec3 direction,float width){return pow(max(dot(r,normalize(direction)),0.),width);}
void main(){
  vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
  vec3 v=normalize(vView);vec3 r=reflect(-v,n);
  float fresnel=pow(1.-max(dot(n,v),0.),3.);
  float key=panel(r,vec3(-.9,1.,1.3),12.);
  float strip=panel(r,vec3(.4,1.5,.5),36.);
  float violet=panel(r,vec3(-1.,-.5,.6),12.);
  float warm=panel(r,vec3(1.3,-.2,.8),50.);
  float fill=.09+max(dot(n,normalize(vec3(.3,.7,1.))),0.)*.16;
  vec3 base=mix(vec3(.045,.033,.075),vec3(.18,.11,.28),.5+.5*sin(vLane*5.+vAngle));
  vec3 color=base*fill;
  color+=vec3(.86,.85,.93)*(key*1.7+strip*1.5+panel(r,vec3(0.,.2,1.),5.)*.27);
  color+=vec3(.43,.22,.95)*violet*.8;
  color+=vec3(.87,.58,.28)*warm*.65;
  color+=vec3(.30,.18,.57)*fresnel*.4;
  float signal=pow(max(0.,cos(vAngle*2.-uTime*.55)),80.);
  color+=vec3(.35,.18,.7)*signal*.045;
  color=pow(max(color,vec3(0.)),vec3(.76));
  gl_FragColor=vec4(color,1.);
}`;

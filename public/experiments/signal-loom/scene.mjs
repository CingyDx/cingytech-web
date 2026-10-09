import { WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, Float32BufferAttribute, ShaderMaterial, Mesh, DoubleSide, SRGBColorSpace, Vector2, AdditiveBlending } from './vendor/three.min.js';
import { vertexShader, fragmentShader } from './shaders.mjs';

export function initScene({host,onStatus}) {
  const container=host.querySelector('.scene-canvas');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let renderer;
  try {
    const targetCanvas=document.createElement('canvas');
    const context=targetCanvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power'});
    if(!context){host.dataset.sceneState='fallback';onStatus('fallback');return null;}
    renderer=new WebGLRenderer({canvas:targetCanvas,context,alpha:true,antialias:true,powerPreference:'low-power'});
  } catch (_) { host.dataset.sceneState='fallback';onStatus('fallback'); return null; }
  renderer.outputColorSpace=SRGBColorSpace;
  renderer.setClearColor(0x08080b,0);
  const canvas=renderer.domElement;
  container.appendChild(canvas);
  const scene=new Scene(),camera=new PerspectiveCamera(36,1,.1,30);
  camera.position.set(0,0,7.3);
  const mobile=matchMedia('(max-width:760px)').matches;
  const segments=mobile?144:208,lanes=mobile?60:92,sides=6,params=[],positions=[],indices=[];
  for(let lane=0;lane<lanes;lane++){
    for(let segment=0;segment<=segments;segment++){
      for(let side=0;side<=sides;side++){
        params.push(segment/segments,lane/lanes-.5,side/sides*Math.PI*2);
        positions.push(0,0,0);
      }
      if(segment<segments){for(let side=0;side<sides;side++){const a=(lane*(segments+1)+segment)*(sides+1)+side;indices.push(a,a+1,a+sides+1,a+1,a+sides+2,a+sides+1);}}
    }
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.setAttribute('aParam',new Float32BufferAttribute(params,3));geometry.setIndex(indices);
  const uniforms={uTime:{value:0},uMode:{value:0},uRadius:{value:mobile?.013:.009}};
  const material=new ShaderMaterial({vertexShader,fragmentShader,uniforms,side:DoubleSide});
  const sculpture=new Mesh(geometry,material);sculpture.frustumCulled=false;
  sculpture.rotation.set(.24,-.38,-.38);scene.add(sculpture);
  const beamGeometry=new BufferGeometry();
  beamGeometry.setAttribute('position',new Float32BufferAttribute([-5,-.018,0,5,-.018,0,5,.018,0,-5,.018,0],3));
  beamGeometry.setAttribute('uv',new Float32BufferAttribute([0,0,1,0,1,1,0,1],2));beamGeometry.setIndex([0,1,2,0,2,3]);
  const beamMaterial=new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,uniforms:{uTime:uniforms.uTime},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv; uniform float uTime; void main(){float light=pow(1.-abs(vUv.y-.5)*2.,3.);float edge=smoothstep(0.,.2,vUv.x)*(1.-smoothstep(.85,1.,vUv.x));vec3 col=mix(vec3(.48,.23,.9),vec3(.95,.68,.38),vUv.x);gl_FragColor=vec4(col,light*edge*.75);}'});
  const beam=new Mesh(beamGeometry,beamMaterial);beam.position.z=-.8;scene.add(beam);
  let frame=0,running=false,visible=true,lost=false,disposed=false,manualMotion=null,mode=0,time=0,last=0,lastPaint=0,samples=0,totalFrameTime=0,totalCadence=0;
  const pointer=new Vector2(),currentPointer=new Vector2();
  let dpr=Math.min(devicePixelRatio||1,mobile?1.25:1.5);
  const needsMotion=()=>!disposed&&!lost&&visible&&!document.hidden&&(manualMotion===null?!reduced.matches:manualMotion);
  const render=()=>{renderer.render(scene,camera);host.classList.add('scene-ready');host.dataset.sceneState='ready';};
  function tick(now){
    running=false;
    if(!needsMotion())return;
    if(now-lastPaint<1000/(mobile?40:60)-1){frame=requestAnimationFrame(tick);running=true;return;}lastPaint=now;
    const dt=last?Math.min((now-last)/1000,.05):.016;last=now;time+=dt;
    uniforms.uTime.value=time;
    uniforms.uMode.value+=(mode-uniforms.uMode.value)*Math.min(dt*2.8,1);
    currentPointer.lerp(pointer,Math.min(dt*3,1));
    sculpture.rotation.x=.24+currentPointer.y*.16+Math.sin(time*.16)*.12;
    sculpture.rotation.y=-.38+currentPointer.x*.22+Math.sin(time*.19)*.38;
    sculpture.rotation.z=-.38+Math.sin(time*.13)*.10;
    const before=performance.now();render();totalFrameTime+=performance.now()-before;totalCadence+=dt*1000;samples++;
    if(samples%90===0){if(dpr>1&&(totalFrameTime/90>22||totalCadence/90>(mobile?37:27))){dpr=1;resize();}totalCadence=0;totalFrameTime=0;}
    host.dataset.frame=String(samples);host.dataset.mode=uniforms.uMode.value.toFixed(2);
    frame=requestAnimationFrame(tick);running=true;
  }
  function sync(){
    if(disposed||lost)return;
    const active=needsMotion();
    if(!active&&running){cancelAnimationFrame(frame);running=false;last=0;}
    if(active&&!running){last=0;frame=requestAnimationFrame(tick);running=true;}
    host.dataset.playing=String(active);
    onStatus(active?'playing':reduced.matches&&manualMotion===null?'reduced':'paused');
  }
  function resize(){
    if(disposed||lost)return;
    const {width,height}=host.getBoundingClientRect();
    renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();render();
  }
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
  const visibilityObserver=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:0});visibilityObserver.observe(host);
  const onVisibility=()=>sync();document.addEventListener('visibilitychange',onVisibility);
  const onReduced=()=>sync();reduced.addEventListener('change',onReduced);
  const onPointer=event=>{const rect=host.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width-.5,(event.clientY-rect.top)/rect.height-.5);};
  host.closest('.hero').addEventListener('pointermove',onPointer,{passive:true});
  const onLoss=event=>{event.preventDefault();lost=true;cancelAnimationFrame(frame);running=false;host.classList.remove('scene-ready');host.dataset.sceneState='lost';host.dataset.playing='false';onStatus('fallback');};
  const onRestore=()=>{lost=false;uniforms.uMode.value=mode;host.dataset.mode=String(mode);resize();sync();};canvas.addEventListener('webglcontextlost',onLoss);canvas.addEventListener('webglcontextrestored',onRestore);
  resize();sync();
  return {
    setMode(value){mode=Math.max(0,Math.min(2,value));if(!needsMotion()&&!lost){uniforms.uMode.value=mode;render();host.dataset.mode=String(mode);}},
    pause(){manualMotion=false;sync();},resume(){manualMotion=true;sync();},
    dispose(){disposed=true;cancelAnimationFrame(frame);resizeObserver.disconnect();visibilityObserver.disconnect();document.removeEventListener('visibilitychange',onVisibility);reduced.removeEventListener('change',onReduced);host.closest('.hero').removeEventListener('pointermove',onPointer);canvas.removeEventListener('webglcontextlost',onLoss);canvas.removeEventListener('webglcontextrestored',onRestore);geometry.dispose();material.dispose();beamGeometry.dispose();beamMaterial.dispose();renderer.dispose();canvas.remove();}
  };
}

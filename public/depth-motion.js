(() => {
  const root=document.documentElement;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const pointer=matchMedia('(hover: hover) and (pointer: fine)');
  const reveals=[...document.querySelectorAll('.reveal,.signal,.portfolio-window,.demo-rail,.method-inner')];
  const surfaces=[...document.querySelectorAll('.signal,.portfolio-window,.subpage .glass,.demo-rail,.contact-form,.button,.header-cta,.btn,.site-header')];
  const seen=new WeakSet(),active=new Set();
  let introStarted=false,pointerEvents;
  const allowed=()=>!root.classList.contains('motion-disabled')&&(!reduced.matches||root.classList.contains('motion-enabled'));
  const scene=document.createElement('div');
  scene.className='optical-scene';scene.setAttribute('aria-hidden','true');
  const pane=document.createElement('span');pane.className='optical-pane';scene.appendChild(pane);
  const droplets=document.createElement('span');droplets.className='depth-droplets';
  [[3,12,17,111,-31],[9,55,11,137,-74],[14,82,15,123,-9],[87,18,14,129,-63],[95,46,19,147,-101],[91,76,12,119,-45],[38,25,9,0,0],[65,72,8,0,0]].forEach(([x,y,size,duration,delay])=>{
    const drop=document.createElement('span');drop.className='depth-drop'+(duration?'':' depth-drop-still');
    drop.style.cssText=`left:${x}%;top:${y}%;width:${size}px;height:${size*1.24}px;--drop-duration:${duration||120}s;--drop-delay:${delay}s`;
    droplets.appendChild(drop);
  });scene.appendChild(droplets);
  document.body.prepend(scene);
  const limited=innerWidth<=760||navigator.connection?.saveData||navigator.hardwareConcurrency<=4||navigator.deviceMemory<=4;
  scene.classList.toggle('optical-lite',Boolean(limited));
  let heroVisible=true;
  const heroDrops=[...document.querySelectorAll('.glass-drop')];
  function sceneMotion(){
    scene.classList.toggle('optical-active',allowed()&&!document.hidden);
    heroDrops.forEach(drop=>{drop.style.animationPlayState=allowed()&&!limited&&!document.hidden&&heroVisible?'running':'paused';});
  }
  const heroLayer=document.querySelector('.hero-art');
  if(heroLayer&&'IntersectionObserver' in window){
    const orbitObserver=new IntersectionObserver(entries=>{heroVisible=entries[0].isIntersecting;sceneMotion();});
    orbitObserver.observe(heroLayer);
  }
  function animate(element,frames,options={}){
    if(!element?.animate||!allowed()||document.hidden)return;
    element.style.willChange='transform, opacity';
    const animation=element.animate(frames,{duration:900,easing:'cubic-bezier(.18,1,.28,1)',fill:'backwards',...options});
    active.add(animation);
    animation.finished.catch(()=>{}).finally(()=>{active.delete(animation);element.style.removeProperty('will-change');});
  }
  function visible(element){const r=element.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}
  function reveal(element){
    if(seen.has(element)||document.hidden)return;
    seen.add(element);element.classList.remove('motion-pending');
    if(!allowed())return;
    const isSlab=element.matches('.signal,.portfolio-window');
    const side=element.matches('.portfolio-banik')?-35:element.matches('.portfolio-wenspol')?35:0;
    const base=getComputedStyle(element).transform;
    animate(element,[{opacity:isSlab?.30:.75,transform:`perspective(1100px) translate3d(${side}px,${isSlab?46:20}px,-65px) ${base==='none'?'':base}`},{opacity:1,transform:base}],{duration:isSlab?1000:700});
  }
  function intro(){
    if(introStarted||!allowed()||document.hidden)return;
    introStarted=true;root.dataset.entrance='running';
    const header=document.querySelector('.site-header'),copy=document.querySelector('.hero-copy'),art=document.querySelector('.hero-art');
    if(header)animate(header,[{opacity:.65,transform:'translate3d(0,-18px,0)'},{opacity:1,transform:'none'}],{duration:720});
    if(copy){seen.add(copy);copy.querySelectorAll('.reveal').forEach(e=>seen.add(e));animate(copy,[{opacity:.65,transform:'translate3d(0,22px,0)'},{opacity:1,transform:'none'}],{duration:850,delay:70});}
    if(art)animate(art,[{opacity:.15,transform:`perspective(1200px) translate3d(${innerWidth<=760?30:100}px,30px,-140px) rotateY(-14deg) rotateZ(7deg) scale(.86)`},{opacity:1,transform:'none'}],{duration:1250,delay:30});
    const shelf=document.querySelector('.service-shelf');
    if(shelf){const base=getComputedStyle(shelf).transform;animate(shelf,[{opacity:.25,transform:`translate3d(0,35px,0) ${base}`},{opacity:1,transform:base}],{duration:1100,delay:160});}
    document.querySelectorAll('.signal').forEach((element,index)=>{
      if(!visible(element))return;
      seen.add(element);
      const base=getComputedStyle(element).transform;
      animate(element,[{opacity:.25,transform:`perspective(1100px) translate3d(${(index-1)*(innerWidth<=760?15:65)}px,${innerWidth<=760?36:70}px,-110px) rotateX(11deg) ${base}`},{opacity:1,transform:base}],{duration:1050,delay:220+index*110});
    });
    const complete=()=>{root.dataset.entrance='complete';};
    Promise.allSettled([...active].map(animation=>animation.finished)).then(complete);
    document.querySelector('.hero')?.setAttribute('data-entrance','choreographed');
  }
  const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){reveal(entry.target);observer.unobserve(entry.target);}});},{threshold:.08,rootMargin:'0px 0px -20px 0px'}):null;
  surfaces.forEach(element=>{
    element.classList.add('optical-surface','depth-managed');
    const optics=document.createElement('span');optics.className='glass-optics';optics.setAttribute('aria-hidden','true');element.appendChild(optics);
    const glint=document.createElement('span');glint.className='glass-glint';optics.appendChild(glint);
  });
  function resetSurface(element){['--tilt-x','--tilt-y','--glint-shift','--hover-progress'].forEach(property=>element.style.removeProperty(property));}
  function configurePointer(){
    pointerEvents?.abort();surfaces.forEach(resetSurface);
    if(!allowed())return;
    pointerEvents=new AbortController();const signal=pointerEvents.signal,options={signal,passive:true};
    const moving=new Set();let frame,last=0;
    // A time-based damped follower avoids restarting a CSS transition on
    // every mouse event, and stays equally gentle at different refresh rates.
    function follow(now){
      frame=null;if(!allowed()||document.hidden||signal.aborted)return;
      const dt=last?Math.min((now-last)/1000,.064):1/60;last=now;
      const blend=1-Math.exp(-dt/.22);
      moving.forEach(state=>{
        let settled=true;
        for(const key of ['x','y','shift']){
          state.value[key]+=(state.target[key]-state.value[key])*blend;
          if(Math.abs(state.target[key]-state.value[key])>.0008)settled=false;
        }
        // Exact damped spring for lift only: about 2% overshoot (under .2px).
        // Tilt and reflection keep the existing gentle, monotonic follower.
        const omega=12,damping=.78,decay=damping*omega,frequency=omega*Math.sqrt(1-damping*damping);
        const offset=state.value.hover-state.target.hover,velocity=state.velocity;
        const fade=Math.exp(-decay*dt),c=Math.cos(frequency*dt),s=Math.sin(frequency*dt);
        state.value.hover=state.target.hover+fade*(offset*c+(velocity+decay*offset)*s/frequency);
        state.velocity=fade*(velocity*c-(decay*velocity+omega*omega*offset)*s/frequency);
        if(Math.abs(state.value.hover-state.target.hover)>.0008||Math.abs(state.velocity)>.0008)settled=false;
        if(settled){Object.assign(state.value,state.target);state.velocity=0;moving.delete(state);}
        const {x,y,shift,hover}=state.value,e=state.element;
        if(settled&&!x&&!y&&!shift&&!hover)resetSurface(e);
        else{e.style.setProperty('--tilt-x',`${x.toFixed(4)}deg`);e.style.setProperty('--tilt-y',`${y.toFixed(4)}deg`);e.style.setProperty('--glint-shift',`${shift.toFixed(4)}px`);e.style.setProperty('--hover-progress',hover.toFixed(4));}
      });
      if(moving.size)frame=requestAnimationFrame(follow);
    }
    function target(state,values){Object.assign(state.target,values);moving.add(state);if(!frame){last=0;frame=requestAnimationFrame(follow);}}
    signal.addEventListener('abort',()=>{cancelAnimationFrame(frame);moving.clear();},{once:true});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=null;moving.forEach(s=>{Object.assign(s.value,{x:0,y:0,shift:0,hover:0});Object.assign(s.target,s.value);s.velocity=0;resetSurface(s.element);});moving.clear();}},{signal});
    surfaces.forEach(element=>{
      let rect;const state={element,velocity:0,value:{x:0,y:0,shift:0,hover:0},target:{x:0,y:0,shift:0,hover:0}};
      const invalidate=()=>{rect=null;};window.addEventListener('scroll',invalidate,{...options,capture:true});window.addEventListener('resize',invalidate,options);
      element.addEventListener('focusin',()=>target(state,{hover:1}),options);
      element.addEventListener('focusout',event=>{if(!element.contains(event.relatedTarget))target(state,{hover:0});},options);
      if(!pointer.matches)return;
      element.addEventListener('pointerenter',()=>{rect=element.getBoundingClientRect();target(state,{hover:1});},options);
      element.addEventListener('pointermove',event=>{
        if(event.pointerType==='touch'||document.hidden)return;rect??=element.getBoundingClientRect();
        const x=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y=Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height));
        target(state,{x:(.5-y)*3.6,y:(x-.5)*5.4,shift:(x-.5)*14,hover:1});
      },options);
      element.addEventListener('pointerleave',()=>{rect=null;target(state,{x:0,y:0,shift:0,hover:element.matches(':focus-visible')?1:0});},options);
    });
  }
  function configure(){
    if(!allowed()){active.forEach(animation=>animation.cancel());reveals.forEach(element=>{element.classList.remove('motion-pending');});root.dataset.entrance='static';}
    else{intro();}
    configurePointer();
    sceneMotion();
  }
  intro();reveals.forEach(element=>{if(observer)observer.observe(element);else reveal(element);});configurePointer();sceneMotion();
  reduced.addEventListener('change',configure);pointer.addEventListener('change',configurePointer);window.addEventListener('cingy-motion-change',configure);
  document.addEventListener('visibilitychange',()=>{sceneMotion();if(document.hidden)active.forEach(animation=>animation.cancel());else{intro();reveals.filter(visible).forEach(reveal);}});
  document.addEventListener('focusin',event=>{const element=event.target.closest('.reveal,.signal,.portfolio-window');if(element){seen.add(element);element.classList.remove('motion-pending');}});
})();

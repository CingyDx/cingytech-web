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
  [[6.27,0,15,198,-43,0.35],[87.15,0,21,199,-169,0.43],[15.91,0,22,178,-102,0.45],[93.42,0,21,141,-63,0.42],[3.49,0,21,228,-97,0.42],[92.03,0,19,182,-174,0.43],[7.72,0,23,202,-72,0.39],[98.03,0,23,216,-50,0.46],[10.0,0,20,220,-11,0.41],[88.29,0,14,194,-50,0.46],[14.06,0,22,166,-49,0.47],[87.9,0,24,182,-188,0.47],[7.22,0,27,234,-84,0.38],[87.02,0,23,178,-174,0.42],[7.79,0,20,143,-63,0.4],[89.04,0,13,159,-151,0.45],[13.5,0,27,195,-198,0.41],[84.54,0,16,181,-39,0.41],[8.23,0,14,234,-46,0.47],[87.06,0,20,173,-156,0.39],[2.81,0,22,183,-99,0.47],[96.09,0,13,162,-19,0.45],[10.98,0,26,162,-54,0.37],[91.39,0,27,206,-186,0.39],[9.8,0,26,140,-160,0.4],[94.74,0,17,234,-95,0.45],[14.84,0,28,159,-65,0.36],[92.37,0,28,233,-209,0.41],[30,0,8,242,-160,0.18],[38,0,7,282,-241,0.18],[45,0,7,225,-215,0.16],[55,0,6,266,-178,0.19],[63,0,6,215,-236,0.16],[69,0,6,215,-182,0.17],[34,0,10,227,-95,0.16],[60,0,10,195,-237,0.13]].forEach(([x,y,size,duration,delay,alpha=.3])=>{
    const drop=document.createElement('span');drop.className='depth-drop'+(duration?'':' depth-drop-still')+(alpha<.25?' depth-drop-far':'');
    drop.style.cssText=`left:${x}%;top:${y}%;width:${size}px;height:${size*1.24}px;--drop-duration:${duration||120}s;--drop-delay:${delay}s;--drop-alpha:${alpha}`;
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
        // Exact damped spring for lift only: about 15% overshoot (around 1px on project cards).
        // Tilt and reflection keep the existing gentle, monotonic follower.
        const omega=10.5,damping=.48,decay=damping*omega,frequency=omega*Math.sqrt(1-damping*damping);
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
        target(state,{x:(.5-y)*3.6,y:(x-.5)*5.4,shift:(x-.5)*(element.matches(".site-header")?96:24),hover:1});
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

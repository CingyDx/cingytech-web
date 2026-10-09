(() => {
  const root=document.documentElement;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const pointer=matchMedia('(hover: hover) and (pointer: fine)');
  const reveals=[...document.querySelectorAll('.reveal,.signal,.portfolio-window,.demo-rail,.method-inner')];
  const surfaces=[...document.querySelectorAll('.signal,.portfolio-window,.subpage .service-card,.subpage .pricing-card,.subpage .post')];
  const seen=new WeakSet(),active=new Set();
  let introStarted=false,pointerEvents;
  const allowed=()=>!root.classList.contains('motion-disabled')&&(!reduced.matches||root.classList.contains('motion-enabled'));
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
  surfaces.forEach(element=>{const glint=document.createElement('span');glint.className='glass-glint';glint.setAttribute('aria-hidden','true');element.appendChild(glint);});
  function resetSurface(element){['--tilt-x','--tilt-y','--glint-shift'].forEach(property=>element.style.removeProperty(property));}
  function configurePointer(){
    pointerEvents?.abort();surfaces.forEach(resetSurface);
    if(!allowed()||!pointer.matches)return;
    pointerEvents=new AbortController();const signal=pointerEvents.signal,options={signal,passive:true};
    surfaces.forEach(element=>{
      let rect,frame,position;
      const invalidate=()=>{rect=null;};window.addEventListener('scroll',invalidate,{...options,capture:true});window.addEventListener('resize',invalidate,options);
      signal.addEventListener('abort',()=>cancelAnimationFrame(frame),{once:true});
      element.addEventListener('pointerenter',()=>{rect=element.getBoundingClientRect();},options);
      element.addEventListener('pointermove',event=>{
        if(event.pointerType==='touch')return;position={x:event.clientX,y:event.clientY};if(frame)return;
        frame=requestAnimationFrame(()=>{frame=null;if(!allowed()||document.hidden||signal.aborted)return;rect??=element.getBoundingClientRect();
          const x=Math.max(0,Math.min(1,(position.x-rect.left)/rect.width)),y=Math.max(0,Math.min(1,(position.y-rect.top)/rect.height));
          element.style.setProperty('--tilt-x',`${(.5-y)*3}deg`);element.style.setProperty('--tilt-y',`${(x-.5)*4}deg`);element.style.setProperty('--glint-shift',`${x*rect.width*1.3}px`);
        });
      },options);
      element.addEventListener('pointerleave',()=>{cancelAnimationFrame(frame);frame=null;rect=null;resetSurface(element);},options);
    });
  }
  function configure(){
    if(!allowed()){active.forEach(animation=>animation.cancel());reveals.forEach(element=>{element.classList.remove('motion-pending');});root.dataset.entrance='static';}
    else{intro();}
    configurePointer();
  }
  intro();reveals.forEach(element=>{if(observer)observer.observe(element);else reveal(element);});configurePointer();
  reduced.addEventListener('change',configure);pointer.addEventListener('change',configurePointer);window.addEventListener('cingy-motion-change',configure);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)active.forEach(animation=>animation.cancel());else{intro();reveals.filter(visible).forEach(reveal);}});
  document.addEventListener('focusin',event=>{const element=event.target.closest('.reveal,.signal,.portfolio-window');if(element){seen.add(element);element.classList.remove('motion-pending');}});
})();

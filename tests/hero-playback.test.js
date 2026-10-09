const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const script=fs.readFileSync(require('node:path').join(__dirname,'../public/hero-orb.js'),'utf8');
function fixture({reduced=false,reject=false,webkit=false,cores}={}){
  const classes=()=>{const set=new Set();return {add:x=>set.add(x),remove:x=>set.delete(x),contains:x=>set.has(x),toggle(x,value){if(value)set.add(x);else set.delete(x)}}};
  const events={},windowEvents={},buttonEvents={};let nextFrame,source='',plays=0,block=reject,qualityCheck;
  const root={classList:classes(),dataset:{}};
  const video={paused:true,readyState:2,dataset:{mp4Small:'small.mp4',mp4Medium:'medium.mp4',mp4Large:'large.mp4'},canPlayType:()=> 'probably',addEventListener:(name,cb)=>events[name]=cb,pause(){this.paused=true;},play(){plays++;if(block)return Promise.reject(Object.assign(new Error('blocked'),{name:'NotAllowedError'}));this.paused=false;return Promise.resolve();},load(){},getAttribute:()=>source,requestVideoFrameCallback(cb){nextFrame=cb;return 1;},cancelVideoFrameCallback(){nextFrame=null;}};
  Object.defineProperty(video,'src',{get:()=>source,set:value=>source=value});
  const art={classList:classes(),dataset:{},querySelector:()=>video};
  const toggle={hidden:true,textContent:'',setAttribute(){},addEventListener:(name,cb)=>buttonEvents[name]=cb};
  const document={documentElement:root,hidden:false,querySelector:selector=>selector==='.hero-art'?art:toggle,addEventListener:(name,cb)=>windowEvents[name]=cb};
  const window={innerWidth:1440,matchMedia:()=>({matches:reduced,addEventListener(){}}),dispatchEvent(){},requestAnimationFrame:cb=>cb(),setInterval(cb){qualityCheck=cb;}};
  vm.runInNewContext(script,{document,window,navigator:{userAgent:webkit?'AppleWebKit/605 Safari/605':'Chrome/142',hardwareConcurrency:cores,connection:{}},localStorage:{setItem(){}},Event:class{},IntersectionObserver:class{observe(){}},requestAnimationFrame:cb=>cb()});
  return {root,art,video,toggle,events,source:()=>source,plays:()=>plays,frame(){nextFrame?.(0,{presentedFrames:1});},quality(total,dropped){video.getVideoPlaybackQuality=()=>({totalVideoFrames:total,droppedVideoFrames:dropped});qualityCheck();},click(){buttonEvents.click();},unblock(){block=false;},hide(){document.hidden=true;windowEvents.visibilitychange();}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('WebKit receives compatible MP4 and plays without a user gesture',async()=>{
 const f=fixture({webkit:true});await flush();assert.equal(f.video.paused,false);assert.equal(f.source(),'medium.mp4');assert.equal(f.plays(),1);
});
test('poster stays until a presented video frame and survives background pause',async()=>{
 const f=fixture();await flush();assert.equal(f.art.classList.contains('video-ready'),false);f.frame();assert.equal(f.art.classList.contains('video-ready'),true);f.hide();assert.equal(f.video.paused,true);assert.equal(f.art.classList.contains('video-ready'),true);
});
test('reduced motion avoids video fetch/play until explicitly enabled',async()=>{
 const f=fixture({reduced:true});await flush();assert.equal(f.source(),'');assert.equal(f.plays(),0);f.click();await flush();assert.equal(f.plays(),1);f.frame();assert.equal(f.art.classList.contains('video-ready'),true);
});
test('blocked autoplay preserves poster and manual retry restores animation',async()=>{
 const f=fixture({reject:true});await flush();assert.equal(f.art.classList.contains('video-ready'),false);assert.match(f.toggle.textContent,/Přehrát/);f.unblock();f.click();await flush();f.frame();assert.equal(f.art.classList.contains('video-ready'),true);
});
test('failed media reloads on manual retry and presents a fresh frame',async()=>{
 const f=fixture();await flush();
 const originalPlay=f.video.play.bind(f.video);
 f.video.play=()=>f.video.error?Promise.reject(new Error('media error')):originalPlay();
 f.video.load=()=>{f.video.error=null;};
 f.video.error={code:4};f.video.paused=true;f.events.error();
 assert.equal(f.art.classList.contains('video-ready'),false);
 f.click();await flush();assert.equal(f.video.error,null);assert.equal(f.video.paused,false);
 f.frame();assert.equal(f.art.classList.contains('video-ready'),true);
});
test('limited desktop starts with the light source without requiring activation',async()=>{
 const f=fixture({cores:4});await flush();assert.equal(f.source(),'small.mp4');assert.equal(f.video.paused,false);assert.equal(f.video.muted,true);
});
test('sustained dropped frames select a lighter source and preserve loop position',async()=>{
 const f=fixture();await flush();f.frame();f.video.currentTime=4.25;f.video.duration=6;
 f.quality(60,0);f.quality(120,20);assert.equal(f.source(),'medium.mp4');f.quality(180,40);await flush();
 assert.equal(f.source(),'small.mp4');assert.equal(f.art.classList.contains('video-ready'),false);
 f.video.currentTime=0;f.events.loadedmetadata();assert.equal(f.video.currentTime,4.25);
 f.frame();assert.equal(f.art.classList.contains('video-ready'),true);
});
test('a single startup hitch does not trigger unnecessary quality switches',async()=>{
 const f=fixture();await flush();f.frame();f.quality(60,0);f.quality(120,20);f.quality(180,20);assert.equal(f.source(),'medium.mp4');assert.equal(f.plays(),1);
});

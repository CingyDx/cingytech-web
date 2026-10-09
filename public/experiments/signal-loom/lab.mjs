import { cleanContacts, exportContacts } from './data-engine.mjs';
document.documentElement.classList.add('js');

const host=document.querySelector('#scene-host');
const status=document.querySelector('#scene-status');
const motionButton=document.querySelector('#motion-toggle');
let scene=null,playing=false,selectedMode=0;
const descriptions=['Web, který dá vašemu podnikání tvář. Od návrhu po spuštění.','Aplikace podle vašeho procesu. Nástroj, který sedí vaší práci.','Propojené nástroje a méně ručních kroků. Podívejte se na experiment níže.'];
function onSceneStatus(state){
  playing=state==='playing';
  motionButton.hidden=state==='fallback';
  motionButton.textContent=playing?'Pozastavit pohyb Ⅱ':'Spustit pohyb ↗';
  motionButton.setAttribute('aria-pressed',String(playing));
  status.textContent=state==='fallback'?'Statická alternativa 3D scény.':state==='reduced'?'Omezený pohyb podle nastavení zařízení.':'';
}
const constrained=navigator.connection?.saveData;
if(constrained){onSceneStatus('fallback');status.textContent='Úsporná statická alternativa.';}
else {
  import('./scene.mjs').then(({initScene})=>{scene=initScene({host,onStatus:onSceneStatus});scene?.setMode(selectedMode);}).catch(()=>onSceneStatus('fallback'));
}
motionButton.addEventListener('click',()=>{if(playing)scene?.pause();else scene?.resume();});
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-mode]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
  const mode=Number(button.dataset.mode);selectedMode=mode;scene?.setMode(mode);
  document.querySelector('#mode-description').textContent=descriptions[mode];
}));
host.querySelector('img').addEventListener('error',()=>host.classList.add('scene-poster-failed'));
window.addEventListener('pagehide',event=>{if(!event.persisted)scene?.dispose();});

const input=document.querySelector('#csv-input'),run=document.querySelector('#run-demo'),reset=document.querySelector('#reset-demo');
const download=document.querySelector('#download-demo'),body=document.querySelector('#demo-rows'),demoStatus=document.querySelector('#demo-status');
const steps=[...document.querySelectorAll('.pipeline li')];
const sample=input.value;let rows=[],runToken=0;
function clearResult(){rows=[];download.disabled=true;body.replaceChildren();const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=3;td.className='empty-result';td.textContent='Upravte vstup a spusťte automatizaci.';tr.append(td);body.append(tr);steps.forEach(step=>step.classList.remove('done'));demoStatus.className='';demoStatus.textContent='Čeká na vaše zadání.';}
input.addEventListener('input',()=>{runToken++;run.disabled=false;run.textContent='Spustit automatizaci ↗';clearResult();});
reset.addEventListener('click',()=>{input.value=sample;input.dispatchEvent(new Event('input'));});
run.addEventListener('click',async()=>{
  const token=++runToken;run.disabled=true;run.textContent='Zpracovávám…';clearResult();
  try {
    const result=cleanContacts(input.value);
    for(const step of steps){if(token!==runToken)return;step.classList.add('done');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)await new Promise(resolve=>setTimeout(resolve,110));}
    if(token!==runToken)return;
    rows=result.rows;body.replaceChildren();
    for(const row of rows){const tr=document.createElement('tr');for(const value of [row.jmeno,row.email,row.stav]){const td=document.createElement('td');td.textContent=value;tr.append(td);}body.append(tr);}
    if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=3;td.textContent='Ve vstupu nejsou platné kontakty.';tr.append(td);body.append(tr);}
    download.disabled=!rows.length;
    const c=result.counts;demoStatus.textContent=`Hotovo: ${c.input} vstupních řádků → ${c.output} kontaktů. Duplicity: ${c.duplicates}. Neplatné: ${c.invalid}.`;
  }catch(error){demoStatus.className='error';demoStatus.textContent=error.message;}
  finally{if(token===runToken){run.disabled=false;run.textContent='Spustit automatizaci ↗';}}
});
download.addEventListener('click',()=>{
  if(!rows.length)return;
  const blob=new Blob(['\ufeff',exportContacts(rows)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download='cingy-vycistene-kontakty.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});

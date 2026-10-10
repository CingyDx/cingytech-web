(()=>{
 'use strict';
 const block=document.querySelector('#automatizace-demo');if(!block)return;
 const model=window.CingyDemoModel,dialog=document.querySelector('#automation-dialog');
 const title=dialog.querySelector('#automation-title'),content=dialog.querySelector('.automation-content'),steps=dialog.querySelector('.automation-steps'),status=dialog.querySelector('.automation-status');
 const run=dialog.querySelector('[data-run]'),reset=dialog.querySelector('[data-reset]'),approve=dialog.querySelector('[data-approve]');
 const inquiry='Eva Šimková, eva@example.com. Potřebujeme web pro penzion: pokoje, galerie a kontaktní formulář. Rozpočet 18000 Kč.';
 const initial={items:[{id:'adapter',name:'USB-C adaptér',quantity:7,minimum:3},{id:'cable',name:'Síťový kabel',quantity:18,minimum:5}],processed:[]};
 const order={id:'DEMO-1048',lines:[{id:'adapter',quantity:5},{id:'cable',quantity:4}]};
 let kind='inquiry',phase=0,timer=null,opener=null,stock,parsed,generation=0;
 const names={inquiry:['Příchozí poptávka','Vytěžení údajů','Evidence záznamu','Návrh ke schválení'],stock:['Příchozí objednávka','Kontrola množství','Aktualizace skladu','Upozornění']};
 function text(selector,value){content.querySelector(selector).textContent=value;}
 function render(){
  steps.replaceChildren(...names[kind].map((name,i)=>{const li=document.createElement('li');li.textContent=name;li.className=i<phase?'done':i===phase?'current':'';return li}));
  if(kind==='inquiry'){
   content.innerHTML='<div class="automation-input"><span class="automation-label">PŘÍCHOZÍ ZPRÁVA · UKÁZKOVÁ</span><p class="demo-message"></p></div><div class="automation-result"><span class="automation-label">ZÁZNAM POPTÁVKY</span><dl><div><dt>Kontakt</dt><dd class="demo-email">Čeká na zpracování</dd></div><div><dt>Rozpočet</dt><dd class="demo-budget">—</dd></div><div><dt>Stav</dt><dd class="demo-state">Nová zpráva</dd></div></dl><label for="demo-draft">Návrh odpovědi</label><textarea id="demo-draft" rows="4" readonly placeholder="Návrh se objeví po zpracování"></textarea><p class="demo-approval-note">Odpověď se nikam neodesílá.</p></div>';
   text('.demo-message',inquiry);
   if(phase>=2){text('.demo-email',parsed.email);text('.demo-budget',new Intl.NumberFormat('cs-CZ').format(parsed.budget)+' Kč');}
   if(phase>=3)text('.demo-state','Evidováno · DEMO-001');
   if(phase>=4){text('.demo-state','Ke schválení');const draft=content.querySelector('#demo-draft');draft.value=parsed.draft;draft.readOnly=false;}
  }else{
   content.innerHTML='<div class="automation-input"><span class="automation-label">OBJEDNÁVKA · UKÁZKOVÁ</span><h3>DEMO-1048</h3><p>5 × USB-C adaptér<br>4 × Síťový kabel</p><p class="automation-muted">Změna se zapíše jen do této ukázky.</p></div><div class="automation-result"><span class="automation-label">SKLADOVÉ ZÁZNAMY</span><table><caption>Množství před a po objednávce</caption><thead><tr><th>Položka</th><th>Před</th><th>Nyní</th><th>Minimum</th></tr></thead><tbody></tbody></table><p class="demo-alert" role="status"></p></div>';
   const body=content.querySelector('tbody');stock.items.forEach((item,i)=>{const row=document.createElement('tr');[item.name,initial.items[i].quantity,item.quantity,item.minimum].forEach(value=>{const cell=document.createElement('td');cell.textContent=value;row.appendChild(cell)});if(phase>=3&&item.quantity<item.minimum)row.className='low';body.appendChild(row)});
   text('.demo-alert',phase>=4?'Dochází USB-C adaptér: zbývají 2 ks, minimum jsou 3. Připravte doplnění skladu.':phase>=3?'Sklad aktualizován. Objednávka zaznamenána jednou.':'Čeká na zpracování objednávky.');
  }
  approve.hidden=kind!=='inquiry'||phase<4;
 }
 function resetDemo(){generation++;clearTimeout(timer);phase=0;stock=structuredClone(initial);parsed=null;run.disabled=false;approve.disabled=false;status.textContent='Připraveno. Spusťte ukázku.';render();}
 function start(){
  if(run.disabled)return;run.disabled=true;approve.hidden=true;const current=++generation;
  function next(){if(current!==generation||!dialog.open)return;phase++;
   if(kind==='inquiry'&&phase===2)parsed=model.parseInquiry(inquiry);
   if(kind==='stock'&&phase===3)stock=model.applyOrder(stock,order);
   render();status.textContent=phase<4?'Zpracování: '+names[kind][phase-1]+'…':kind==='inquiry'?'Hotovo: návrh čeká na lidské schválení.':'Hotovo: sklad aktualizován, upozornění připraveno.';
   if(phase<4)timer=setTimeout(next,650);
  }next();
 }
 block.querySelectorAll('[data-demo]').forEach(button=>button.addEventListener('click',()=>{
  opener=button;kind=button.dataset.demo;title.textContent=kind==='inquiry'?'Z poptávky k návrhu odpovědi':'Z objednávky do skladu';resetDemo();dialog.showModal();document.body.classList.add('automation-open');dialog.querySelector('[data-close]').focus();
 }));
 run.addEventListener('click',start);reset.addEventListener('click',resetDemo);
 approve.addEventListener('click',()=>{approve.disabled=true;content.querySelector('#demo-draft').readOnly=true;text('.demo-state','Schváleno v ukázce · neodesláno');status.textContent='Návrh schválen v ukázce. Žádný e-mail nebyl odeslán.';});
 dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 dialog.addEventListener('close',()=>{generation++;clearTimeout(timer);document.body.classList.remove('automation-open');opener?.focus({preventScroll:true});});
})();

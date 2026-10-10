const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parseInquiry,applyOrder}=require('../public/automation-demo-model.js');
test('inquiry preserves customer data and produces an unsent draft requiring approval',()=>{
 const result=parseInquiry('Eva Šimková, eva@example.com. Potřebujeme web pro penzion. Rozpočet 18000 Kč.');
 assert.equal(result.email,'eva@example.com');assert.equal(result.budget,18000);
 assert.equal(result.status,'Ke schválení');assert.equal(result.sent,false);
 assert.ok(result.draft.includes('penzion'));assert.ok(result.draft.includes('termín'));
});
test('incomplete inquiry identifies missing contact instead of inventing it',()=>{
 const result=parseInquiry('Potřebujeme nový web.');
 assert.equal(result.email,null);assert.ok(result.missing.includes('E-mail'));
});
const stock={items:[{id:'adapter',name:'USB-C adaptér',quantity:7,minimum:3},{id:'cable',name:'Síťový kabel',quantity:18,minimum:5}],processed:[]};
const order={id:'DEMO-1048',lines:[{id:'adapter',quantity:5},{id:'cable',quantity:4}]};
test('order updates only requested quantities and reports low stock without mutating input',()=>{
 const next=applyOrder(stock,order);
 assert.deepEqual(next.items.map(i=>i.quantity),[2,14]);assert.deepEqual(stock.items.map(i=>i.quantity),[7,18]);
 assert.deepEqual(next.alerts.map(i=>i.id),['adapter']);
});
test('repeated order does not deduct stock twice',()=>{
 const once=applyOrder(stock,order);const twice=applyOrder(once,order);
 assert.deepEqual(twice.items,once.items);assert.equal(twice.processed.length,1);
});
test('insufficient stock rejects the whole order and keeps original quantities',()=>{
 assert.throws(()=>applyOrder(stock,{id:'X',lines:[{id:'cable',quantity:4},{id:'adapter',quantity:8}]}),/sklad/);
 assert.deepEqual(stock.items.map(i=>i.quantity),[7,18]);
});

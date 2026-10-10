(function(root){
 'use strict';
 function parseInquiry(message){
  const email=message.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0]||null;
  const budget=Number(message.match(/(?:rozpočet\s*)(\d+)/i)?.[1])||null;
  return {email,budget,status:'Ke schválení',sent:false,missing:[...(!email?['E-mail']:[]),...(!budget?['Rozpočet']:[])],draft:'Dobrý den, děkujeme za poptávku webu'+(/penzion/i.test(message)?' pro penzion':'')+'. Jaký termín spuštění máte na mysli a kolik pokojů nebo služeb chcete představit? Po upřesnění připravíme návrh rozsahu a ceny. Cingy.Tech'};
 }
 function applyOrder(stock,order){
  if(stock.processed.includes(order.id))return structuredClone(stock);
  const next=structuredClone(stock);
  for(const line of order.lines){
   const item=next.items.find(i=>i.id===line.id);
   if(!item||!Number.isInteger(line.quantity)||line.quantity<=0||line.quantity>item.quantity)throw new Error('Objednávku nelze odečíst: zkontrolujte sklad a množství.');
   item.quantity-=line.quantity;
  }
  next.processed.push(order.id);next.alerts=next.items.filter(i=>i.quantity<i.minimum);
  return next;
 }
 const api={parseInquiry,applyOrder};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.CingyDemoModel=api;
})(globalThis);

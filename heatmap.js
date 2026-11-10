// ===== Claude D: লিকুইডেশন লাইভ স্ট্রিম + হিটম্যাপ বার =====
const Liq=(()=>{
const B={},ev=[];let ws,onBig=()=>{},step=100;
function start(cb){onBig=cb||onBig;try{ws=new WebSocket('wss://fstream.binance.com/ws/btcusdt@forceOrder');
 ws.onmessage=m=>{const o=JSON.parse(m.data).o,usd=+o.q*+o.ap,k=Math.round(+o.ap/step)*step;
  const x=B[k]=B[k]||{L:0,S:0};(o.S==='SELL'?x.L+=usd:x.S+=usd);ev.push({t:Date.now(),usd,side:o.S==='SELL'?'লং':'শর্ট',p:+o.ap});
  if(usd>=300000)onBig(usd,o.S==='SELL'?'লং':'শর্ট',+o.ap)};
 ws.onclose=()=>setTimeout(()=>start(),5000)}catch(e){}}
function inZone(lo,hi){return Object.keys(B).filter(k=>k>=lo&&k<=hi).reduce((s,k)=>s+B[k].L+B[k].S,0)}
function render(price){const ks=Object.keys(B).map(Number).sort((a,b)=>b-a).filter(k=>Math.abs(k-price)<3000);if(!ks.length)return '<p class=mut>এখনো কোনো লিকুইডেশন আসেনি (পেজ খোলা রাখুন)</p>';
 const mx=Math.max(...ks.map(k=>B[k].L+B[k].S));return ks.map(k=>{const a=B[k].L,b=B[k].S;return `<div class=hm><span>${k}</span><i style="width:${100*a/mx}%;background:#f6465d"></i><i style="width:${100*b/mx}%;background:#2ebd85"></i><em>$${((a+b)/1e3).toFixed(0)}k</em></div>`}).join('')}
return {start,inZone,render};
})();

// ===== Claude C: অপশন গ্রুপ (Deribit: Put/Call, Max Pain, DVOL, GEX) — কম ভরসা =====
const Options=(()=>{
const N=x=>{const t=Math.abs(x),e=Math.exp(-x*x/2)/Math.sqrt(2*Math.PI);return e};
function gamma(S,K,iv,T){if(T<=0||iv<=0)return 0;const d=(Math.log(S/K)+0.5*iv*iv*T)/(iv*Math.sqrt(T));return N(d)/(S*iv*Math.sqrt(T))}
async function run(){
 try{
  const r=await fetch('https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=BTC&kind=option');
  const j=(await r.json()).result;let pO=0,cO=0;const ex={};let gex=0;const now=Date.now();
  j.forEach(o=>{const p=o.instrument_name.split('-');const K=+p[2],isC=p[3]==='C',oi=o.open_interest||0,S=o.underlying_price;
   isC?cO+=oi:pO+=oi;(ex[p[1]]=ex[p[1]]||{})[K]=ex[p[1]][K]||{c:0,p:0};ex[p[1]][K][isC?'c':'p']+=oi;
   const T=(o.creation_timestamp?0:0)||0;const d=new Date(p[1]+' 08:00 UTC').getTime();const t=(d-now)/31536e6;
   gex+=(isC?1:-1)*gamma(S,K,(o.mark_iv||0)/100,t)*oi*S*S*0.01});
  const first=Object.keys(ex).map(e=>({e,d:new Date(e+' 08:00 UTC').getTime()})).filter(x=>x.d>now).sort((a,b)=>a.d-b.d)[0];
  let mp=null;if(first){const st=ex[first.e],ks=Object.keys(st).map(Number);let best=1e99;ks.forEach(k=>{let pain=0;ks.forEach(s=>{pain+=st[s].c*Math.max(0,k-s)+st[s].p*Math.max(0,s-k)});if(pain<best){best=pain;mp=k}})}
  let dvol=null;try{const e=Date.now(),s=e-864e5*7;const d=await (await fetch('https://www.deribit.com/api/v2/public/get_volatility_index_data?currency=BTC&resolution=3600&start_timestamp='+s+'&end_timestamp='+e)).json();const c=d.result.data.map(x=>x[4]);dvol={v:c[c.length-1],p:100*c.filter(x=>x<=c[c.length-1]).length/c.length}}catch(e){}
  return {ok:true,pc:cO?pO/cO:null,maxPain:mp,expiry:first&&first.e,dvol,gex}
 }catch(e){return {ok:false}}
}
return {run};
})();

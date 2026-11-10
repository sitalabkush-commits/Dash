// ===== Claude A: ইঞ্জিন (ডেটা + মেট্রিক + ভার্ডিক্ট) =====
const Engine=(()=>{
const F='https://fapi.binance.com',S='BTCUSDT',fresh={};
async function get(n,u){try{const r=await fetch(u);if(!r.ok)throw 0;const j=await r.json();fresh[n]={t:Date.now(),ok:true};return j}catch(e){fresh[n]={t:(fresh[n]||{}).t||0,ok:false};return null}}
const pct=(a,v)=>a.length?100*a.filter(x=>x<=v).length/a.length:50;
const clamp=x=>Math.max(-1,Math.min(1,x));
const sc=(p,s)=>clamp(s*(p-50)/50);
function roll(a,n){const o=[];for(let i=n;i<=a.length;i++)o.push(a.slice(i-n,i).reduce((x,y)=>x+y,0));return o}
const DEF={on:{funding:1,basis:1,ls:1,cvd:1,taker:1,oi:1},w:{flow:40,pos:20,crowd:40}};
function settings(){try{return Object.assign({},DEF,JSON.parse(localStorage.getItem('cfg')||'{}'))}catch(e){return DEF}}
function save(c){try{localStorage.setItem('cfg',JSON.stringify(c))}catch(e){}}
async function run(zone){
 const q=(n,p)=>get(n,F+p);
 const [prem,oiH,ls,tk,kl,fr,pk,depth,agg]=await Promise.all([
  q('premium','/fapi/v1/premiumIndex?symbol='+S),
  q('oiHist','/futures/data/openInterestHist?symbol='+S+'&period=1h&limit=500'),
  q('ls','/futures/data/globalLongShortAccountRatio?symbol='+S+'&period=1h&limit=500'),
  q('taker','/futures/data/takerlongshortRatio?symbol='+S+'&period=1h&limit=500'),
  q('klines','/fapi/v1/klines?symbol='+S+'&interval=1h&limit=500'),
  q('fundHist','/fapi/v1/fundingRate?symbol='+S+'&limit=500'),
  q('basisHist','/fapi/v1/premiumIndexKlines?symbol='+S+'&interval=1h&limit=500'),
  q('depth','/fapi/v1/depth?symbol='+S+'&limit=1000'),
  q('agg','/fapi/v1/aggTrades?symbol='+S+'&limit=1000')]);
 let fb=null;if(!prem)fb=await get('bybit','https://api.bybit.com/v5/market/tickers?category=linear&symbol='+S);
 const bt=fb&&fb.result&&fb.result.list&&fb.result.list[0];
 const price=prem?+prem.markPrice:bt?+bt.markPrice:kl?+kl[kl.length-1][4]:0;
 const M=[];const add=(id,name,group,val,p,s,src)=>M.push({id,name,group,val,pct:p,score:s,src,ok:(fresh[src]||{}).ok,t:(fresh[src]||{}).t});
 const fnow=prem?+prem.lastFundingRate:bt?+bt.fundingRate:null;
 if(fnow!=null){const h=fr?fr.map(x=>+x.fundingRate):[];const p=pct(h,fnow);add('funding','Funding','crowd',(fnow*100).toFixed(4)+'%',p,sc(p,-1),prem?'premium':'bybit')}
 if(prem){const b=(+prem.markPrice-+prem.indexPrice)/+prem.indexPrice;const h=pk?pk.map(x=>+x[4]):[];const p=pct(h,b);add('basis','Basis','crowd',(b*100).toFixed(3)+'%',p,sc(p,-1),'premium')}
 if(ls&&ls.length){const h=ls.map(x=>+x.longShortRatio),c=h[h.length-1],p=pct(h,c);add('ls','Long/Short','crowd',c.toFixed(2),p,sc(p,-1),'ls')}
 if(kl&&kl.length>30){const d=kl.map(k=>2*+k[9]-+k[5]),r=roll(d,24),c=r[r.length-1],p=pct(r,c);add('cvd','CVD (২৪ঘ)','flow',c.toFixed(0)+' BTC',p,sc(p,1),'klines')}
 if(tk&&tk.length){const h=tk.map(x=>+x.buySellRatio),c=h.slice(-4).reduce((a,b)=>a+b,0)/4,p=pct(h,c);add('taker','Taker Buy/Sell','flow',c.toFixed(2),p,sc(p,1),'taker')}
 if(oiH&&oiH.length>30&&kl){const o=oiH.map(x=>+x.sumOpenInterestValue),ch=[];for(let i=24;i<o.length;i++)ch.push(o[i]/o[i-24]-1);const c=ch[ch.length-1],p=pct(ch,c);const pc=kl[kl.length-1][4]/kl[kl.length-25][4]-1;add('oi','OI (২৪ঘ পরিবর্তন)','pos',(c*100).toFixed(2)+'% / দাম '+(pc*100).toFixed(1)+'%',p,sc(p,pc>=0?1:-1),'oiHist')}
 const cfg=settings(),G={};
 M.forEach(m=>{if(cfg.on[m.id]&&m.ok!==false){(G[m.group]=G[m.group]||[]).push(m.score)}});
 const gs={};let num=0,den=0;
 for(const g in G){gs[g]=G[g].reduce((a,b)=>a+b,0)/G[g].length;num+=gs[g]*cfg.w[g];den+=cfg.w[g]}
 const tot=den?num/den:0,dir=tot>0.12?'LONG':tot<-0.12?'SHORT':'NEUTRAL';
 const act=M.filter(m=>cfg.on[m.id]&&m.ok!==false),sg=Math.sign(tot);
 const agree=dir==='NEUTRAL'?act.filter(m=>Math.abs(m.score)<0.25).length:act.filter(m=>Math.sign(m.score)===sg&&Math.abs(m.score)>=0.2).length;
 const strong=Object.keys(gs).filter(g=>Math.abs(gs[g])>0.25),conflict=strong.some(g=>gs[g]>0)&&strong.some(g=>gs[g]<0);
 const top=Object.keys(gs).sort((a,b)=>Math.abs(gs[b]*cfg.w[b])-Math.abs(gs[a]*cfg.w[a]))[0];
 // জোন
 let z=null;
 if(zone&&zone.lo&&zone.hi){z={lo:zone.lo,hi:zone.hi,delta:null,bid:0,ask:0,wall:null};
  if(agg){z.delta=agg.filter(t=>+t.p>=zone.lo&&+t.p<=zone.hi).reduce((s,t)=>s+(t.m?-1:1)*+t.q,0)}
  if(depth){const w=[];depth.bids.forEach(([p,q])=>{if(+p>=zone.lo&&+p<=zone.hi){z.bid+=+q;w.push({p:+p,q:+q,side:'বিড'})}});depth.asks.forEach(([p,q])=>{if(+p>=zone.lo&&+p<=zone.hi){z.ask+=+q;w.push({p:+p,q:+q,side:'আস্ক'})}});w.sort((a,b)=>b.q-a.q);z.wall=w[0]||null}}
 return {price,M,gs,tot,dir,agree,n:act.length,conflict,top,zone:z,fresh,cfg,usedFallback:!!fb,depth};
}
return {run,settings,save,fresh,S};
})();

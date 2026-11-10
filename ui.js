// ===== Claude B: UI =====
const $=id=>document.getElementById(id);
const fmt=n=>n==null?'—':(+n).toLocaleString('en',{maximumFractionDigits:2});
const GN={flow:'অর্ডার ফ্লো',pos:'পজিশনিং',crowd:'ভিড় (Crowd)'};
const col=s=>s>0.15?'#2ebd85':s<-0.15?'#f6465d':'#8b93a1';
const tag=p=>p>=80?'High':p<=20?'Low':'Mid';
let zone=JSON.parse(localStorage.getItem('zone')||'null'),prevFund=null,last=null;
function log(r){try{const L=JSON.parse(localStorage.getItem('vlog')||'[]');const l=L[L.length-1];if(!l||Date.now()-l.t>36e5){L.push({t:Date.now(),d:r.dir,p:r.price,s:r.tot});localStorage.setItem('vlog',JSON.stringify(L.slice(-500)))}}catch(e){}}
function logHtml(){let L=[];try{L=JSON.parse(localStorage.getItem('vlog')||'[]')}catch(e){}
 let ok=0,tot=0;const rows=L.map((x,i)=>{const nx=L.slice(i+1).find(y=>y.t-x.t>=4*36e5);let res='⏳';if(nx&&x.d!=='NEUTRAL'){const up=nx.p>x.p;const hit=(x.d==='LONG')===up;res=hit?'✅':'❌';tot++;if(hit)ok++}else if(nx)res='—';return `<tr><td>${new Date(x.t).toLocaleString('bn-BD',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'})}</td><td>${x.d}</td><td>${fmt(x.p)}</td><td>${res}</td></tr>`}).reverse().slice(0,30).join('');
 return `<p>সঠিকতা (৪ঘ পরে): <b>${tot?Math.round(100*ok/tot)+'% ('+ok+'/'+tot+')':'ডেটা জমছে…'}</b></p><table>${rows}</table>`}
function flash(t){const f=$('flash');f.textContent=t;f.style.display='block';setTimeout(()=>f.style.display='none',8000)}
async function draw(){
 $('st').textContent='লোড হচ্ছে…';
 const r=await Engine.run(zone);last=r;
 const f=r.M.find(m=>m.id==='funding');if(f){const v=Math.sign(parseFloat(f.val));if(prevFund!=null&&v!==prevFund&&v!==0)flash('⚡ Funding সাইন বদলেছে: '+f.val);prevFund=v}
 const dc=r.dir==='LONG'?'#2ebd85':r.dir==='SHORT'?'#f6465d':'#8b93a1';
 let h=`<div class=card style="border-color:${dc}"><div class=mut>BTCUSDT · $${fmt(r.price)}${r.usedFallback?' · ⚠ Bybit ফলব্যাক':''}</div><div class=big style="color:${dc}">${r.dir==='LONG'?'লং':r.dir==='SHORT'?'শর্ট':'নিরপেক্ষ'}</div><div>${r.agree}/${r.n} মেট্রিক একমত <small class=mut>(সম্ভাবনা নয়, শুধু একমত হওয়ার হার)</small></div><div class=mut>সবচেয়ে বেশি টানছে: ${GN[r.top]||'—'}</div></div>`;
 if(r.conflict)h+=`<div class="card warn">⚠ মতভেদ: গ্রুপগুলো উল্টো দিকে। জোর করে একটা দিক ধরবেন না।</div>`;
 const z=r.zone;h+=`<div class=card><b>জোন প্যানেল</b><div class=row><input id=lo type=number placeholder=Low value="${zone?zone.lo:''}"><input id=hi type=number placeholder=High value="${zone?zone.hi:''}"><button onclick=setZone()>সেট</button></div>`;
 if(z){const lq=Liq.inZone(z.lo,z.hi);h+=`<div>ডেল্টা (শেষ ১০০০ ট্রেড): <b style="color:${col(z.delta)}">${fmt(z.delta)} BTC</b></div><div>বিড দেয়াল: ${fmt(z.bid)} · আস্ক দেয়াল: ${fmt(z.ask)} BTC</div><div>সবচেয়ে বড় দেয়াল: ${z.wall?z.wall.side+' @'+fmt(z.wall.p)+' ('+fmt(z.wall.q)+' BTC)':'—'}</div><div>লিকুইডেশন (সেশনে): $${fmt(lq)}</div>`}else h+=`<p class=mut>Low–High দিন, যেমন 90000–91000</p>`;h+=`</div>`;
 const gk=['flow','pos','crowd'];
 gk.forEach(g=>{const ms=r.M.filter(m=>m.group===g);if(!ms.length)return;
  h+=`<details class=card open><summary><b>${GN[g]}</b> <span style="color:${col(r.gs[g]||0)}">${(r.gs[g]||0).toFixed(2)}</span><span class=mut> · ওজন </span><input class=w type=number value=${r.cfg.w[g]} onclick="event.stopPropagation()" onchange="setW('${g}',this.value)"></summary>`;
  ms.forEach(m=>{const age=m.t?Math.round((Date.now()-m.t)/1000):null;h+=`<div class=row2><label><input type=checkbox ${r.cfg.on[m.id]?'checked':''} onchange="setOn('${m.id}',this.checked)"> ${m.name}</label><span>${m.val}</span><span style="color:${col(m.score)}">${tag(m.pct)} ${Math.round(m.pct)}%</span><small class=${m.ok===false?'red':'mut'}>${m.ok===false?'🔴 ফেল':age+'s'}</small></div>`});
  if(g==='crowd')h+=`<small class=mut>Funding/Basis/L-S একই জিনিস মাপে, তাই গ্রুপ গড় ধরা হয়, আলাদা ওজন নয়।</small>`;h+=`</details>`});
 h+=`<details class=card><summary><b>অপশন (কম ভরসা)</b></summary><div id=opt class=mut>লোড হচ্ছে…</div></details>`;
 h+=`<details class=card><summary><b>লিকুইডেশন হিটম্যাপ</b> <small class=mut>(লাল=লং, সবুজ=শর্ট)</small></summary>${Liq.render(r.price)}</details>`;
 h+=`<details class=card><summary><b>ভার্ডিক্ট লগ</b></summary>${logHtml()}</details>`;
 $('app').innerHTML=h;$('st').textContent='আপডেট: '+new Date().toLocaleTimeString();
 log(r);
 const o=await Options.run();$('opt')&&($('opt').innerHTML=o.ok?`<div>Put/Call (OI): <b>${o.pc?o.pc.toFixed(2):'—'}</b></div><div>Max Pain (${o.expiry||''}): <b>${fmt(o.maxPain)}</b></div><div>DVOL: <b>${o.dvol?o.dvol.v.toFixed(1)+' ('+Math.round(o.dvol.p)+'%)':'—'}</b></div><div>GEX (আনুমানিক): <b>${(o.gex/1e6).toFixed(1)}M</b> ⚠ কম ভরসা</div>`:'Deribit ডেটা আসেনি');
}
function setZone(){const lo=+$('lo').value,hi=+$('hi').value;zone=lo&&hi&&lo<hi?{lo,hi}:null;localStorage.setItem('zone',JSON.stringify(zone));draw()}
function setOn(id,v){const c=Engine.settings();c.on[id]=v?1:0;Engine.save(c);draw()}
function setW(g,v){const c=Engine.settings();c.w[g]=+v||0;Engine.save(c);draw()}
Liq.start((u,s,p)=>flash('💥 বড় লিকুইডেশন: '+s+' $'+Math.round(u/1000)+'k @'+fmt(p)));
draw();setInterval(draw,60000);

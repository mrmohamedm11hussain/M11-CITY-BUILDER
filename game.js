const $=id=>document.getElementById(id),V=$('view');
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const QMAX=3,FB=['ماعنديش حاجة تانية أقولها.','قلت اللي عندي. اسأل حد غيري.','إنت بتضيّع وقتك معايا.'];
let C,P={name:'',notes:[],ex:{},msg:''},wt,busy=0;
function plays(){try{return+localStorage.getItem('m11p')||0}catch(e){return 0}}
function addPlay(){try{localStorage.setItem('m11p',plays()+1)}catch(e){}}
function whisper(t){const w=$('whisper');w.textContent=t;w.classList.add('on');clearTimeout(wt);wt=setTimeout(()=>w.classList.remove('on'),6000)}
function flicker(){document.body.classList.remove('fl');void document.body.offsetWidth;document.body.classList.add('fl')}
function hint(){const l=C.locs.find(x=>x.clues.slice(x.i).some(c=>c.key));if(!l)return false;
 P.notes.push({t:`نسختك القديمة كتبت بخط إيدك: «لسه في حاجة مهمة في ${l.name}».`,cls:'g'});Snd.hiss();whisper('في ورقة ظهرت في الدفتر… ماكتبتهاش.');return true}
function start(){V.innerHTML=`<div class="cover">${Art.cover()}</div><h1>نسختك القديمة</h1><p class="sub">لعبة تحقيق وغموض — كل مرة جريمة مختلفة يولّدها «الصدى»</p><input id="nm" placeholder="اسمك" maxlength="12" aria-label="اسمك"><input id="sd" placeholder="رقم ملف (اختياري — نفس الرقم = نفس القضية)" inputmode="numeric" aria-label="رقم الملف"><button onclick="begin()">افتح ملف جديد</button><p class="by">تطوير: مستر محمد حسين · يُفضّل سماعات وضلمة</p>`}

// بداية القضية: الافتتاحية بتتولّد في الخلفية (5 ثواني بحد أقصى) ولو فشلت اللعبة تكمّل عادي
async function begin(){P.name=$('nm').value.trim()||'يا محقق';const s=parseInt($('sd').value)||1000+Math.floor(Math.random()*9000);
 Snd.init();C=build(s,plays());C.qn={};C.log={};C.cur=-1;C.ai=/^https:/.test(AI.url);AI.begin(C);
 P.notes=[];P.ex={};P.msg='';Snd.creak();
 if(C.ai){V.innerHTML='<p class="sub">جاري فتح الملف السري…</p>';const c=C;
  const t=await Promise.race([AI.intro(c),new Promise(r=>setTimeout(()=>r(null),5000))]);
  if(c!==C)return;C.intro=t}
 brief()}

function brief(){const sus=C.sus.map(s=>s.n).join('، ');
 V.innerHTML=`<header><span>ملف سري #${C.seed}</span><span>${C.sus.length} مشتبه</span></header>${C.intro?`<p class="story">${esc(C.intro)}</p>`:''}<p class="story">الساعة ${C.time} قبل الفجر.\nلقوا ${C.victim} ميت في ${C.place}. السبب مش معروف، والسلاح اختفى.\nأربعة كانوا في المكان: ${sus}. واحد منهم القاتل، والباقي بيكذبوا عشان أسباب تانية.\nعندك ${C.max} خطوة قبل الفجر.\nعلى غلاف الملف، بخط إيدك: «هو لسه هنا يا ${P.name}».</p><button onclick="hub()">ابدأ التحقيق</button>`}

function hub(){C.cur=-1;let h=`<header><span>ملف #${C.seed}</span><span title="الخطوات المتبقية">${'●'.repeat(C.b)}${'○'.repeat(C.max-C.b)}</span></header><p id="msg">${P.msg||'اختار مكان تفتّشه أو مشتبه تفحصه. كل خطوة بتاكل من الليل.'}</p><h3>الأماكن</h3><div class="grid">`;
 C.locs.forEach((l,i)=>h+=`<button class="card" onclick="search(${i})">${Art.scene(l.k)}<b>${l.name}</b><small>${l.i>=l.clues.length?'خلّصت التفتيش':'فتّش'}</small></button>`);
 h+='</div><h3>المشتبه فيهم</h3><div class="grid">';
 C.sus.forEach((s,i)=>h+=`<button class="card" onclick="exam(${i})">${Art.face(s.seed,i)}<b>${s.n}</b><small>${s.job}</small>${P.ex[i]?`<small class="d">حذاء ${s.shoe} · ريحة ${s.perf}<br>${HV[s.hand]}<br>${s.tell}<br>«${s.say}»</small>`:'<small>افحص</small>'}</button>`);
 h+='</div>';
 if(C.ai)h+='<div class="row">'+C.sus.map((s,i)=>`<button class="mini" onclick="talk(${i})">استجواب ${esc(s.n.split(' ')[0])}</button>`).join('')+'</div>';
 h+='<h3>دفتر الملاحظات</h3><ul>'+(P.notes.map(n=>`<li class="${n.cls||(n.key?'k':'')}">${n.t}</li>`).join('')||'<li>فاضي</li>')+'</ul><button onclick="accuse()">وجّه الاتهام</button>';
 V.innerHTML=h}

function spend(msg,note,snd){if(C.b<=0)return accuse();C.b--;Echo.tick();P.msg=msg;if(note)P.notes.push(note);Snd[snd]();hub();Echo.pulse();if(C.b<=0){P.msg+='\nالفجر طلع. لازم تتهم دلوقتي.';hub();setTimeout(accuse,2500)}else hub()}
function search(i){const l=C.locs[i];if(l.i>=l.clues.length){P.msg='المكان ده فتّشته كله.';return hub()}
 const c=l.clues[l.i++];spend(`${l.name}: ${c.t}`,{t:`${l.name}: ${c.t}`,key:c.key},c.key?'ding':'creak')}
function exam(i){const s=C.sus[i];if(P.ex[i]){P.msg=`فحصت ${s.n} قبل كده.`;return hub()}
 P.ex[i]=1;spend(`فحصت ${s.n}: ${s.tell}. قال: «${s.say}»`,{t:`${s.n}: حذاء ${s.shoe}، ريحة ${s.perf}، ${HV[s.hand]}.`},'hiss')}

// ===== الاستجواب (بيشتغل بس لو AI.url متظبط). مش بياكل خطوات، و3 أسئلة لكل مشتبه (QMAX) =====
function line(box,q,a){if(!box)return null;const d=document.createElement('div');d.className='qa';
 const x=document.createElement('p');x.className='q';x.textContent='— '+q;
 const y=document.createElement('p');y.className='a';y.textContent=a;d.append(x,y);box.append(d);return y}
function talk(i){const s=C.sus[i],left=QMAX-(C.qn[i]||0);C.cur=i;
 V.innerHTML=`<header><span>استجواب: ${esc(s.n)}</span><span>${left} أسئلة</span></header><p class="sub">${esc(s.job)}</p><div id="log"></div>`+
 (left>0?`<div class="row">${AI.QUICK.map((q,j)=>`<button class="mini" onclick="askQ(${i},AI.QUICK[${j}])">${q}</button>`).join('')}</div><input id="q" maxlength="120" placeholder="اسأله سؤالك…" aria-label="سؤالك"><button onclick="askQ(${i},$('q').value)">اسأل</button>`:'<p class="sub">خلّصت أسئلتك معاه.</p>')+
 '<button onclick="hub()">رجوع</button>';
 (C.log[i]||[]).forEach(h=>line($('log'),h[0],h[1]))}
async function askQ(i,q){q=(q||'').trim();if(!q||busy||(C.qn[i]||0)>=QMAX)return;
 const c=C,s=c.sus[i];busy=1;c.qn[i]=(c.qn[i]||0)+1;
 line($('log'),q,'…');Snd.hiss();
 let a=await AI.interrogate(c,i,q);
 if(!a)a=c.qn[i]===1?s.say:FB[(c.qn[i]-2)%FB.length];
 (c.log[i]=c.log[i]||[]).push([q,a]);
 P.notes.push({t:`${esc(s.n)} قال: «${esc(a.slice(0,90))}»`});
 busy=0;
 if(c===C&&C.cur===i)talk(i)}

function accuse(){V.innerHTML=`<h2>مين القاتل؟</h2><p class="sub">قارن الأدلة في الدفتر بمواصفات كل مشتبه. اتهام واحد بس.</p><div class="grid">`+C.sus.map((s,i)=>`<button class="card" onclick="verdict(${i})">${Art.face(s.seed,i)}<b>${s.n}</b><small>${s.job}</small></button>`).join('')+'</div>'}
function verdict(i){const k=C.sus[C.k],ok=i===C.k,c=C;addPlay();Snd.beat();flicker();
 const body=ok?`${k.n} سكت… وبعدين ضحك ضحكة مش بتاعته. اعترف إن السبب «${C.m}»، وإنه استخدم ${C.w}. القضية اتقفلت قبل الفجر.`:`${C.sus[i].n} طلع بريء. وإنت بتبعد، ${k.n} ابتسم بهدوء… وهرب. السبب كان «${C.m}» والسلاح ${C.w}.`;
 V.innerHTML=`<h2>${ok?'القضية اتحلّت':'القاتل هرب'}</h2><p class="story" id="bd"></p><p class="story">وإنت بتقفل الملف، لاحظت إن كل الملاحظات بخط إيدك… وإنت مش فاكر إنك كتبتها. نسختك القديمة حلّت القضية دي قبلك، وسابتلك الملف عشان تكمل مكانها.\nالقضية الجاية بدأت تتكتب لوحدها.</p><p class="stats">${Echo.rep()}<br>رقم الملف: #${C.seed} (ابعته لصاحبك يلعب نفس القضية)<br>قضايا لعبتها: ${plays()}${plays()>=2?' — الصدى بقى يعمّي عليك أكتر':''}</p><button onclick="start()">ملف جديد</button><p class="by">M11 Development — مستر محمد حسين</p>`;
 $('bd').textContent=body;
 if(c.ai)AI.epilogue(c,ok).then(t=>{const b=$('bd');if(t&&b&&c===C)b.textContent=t})}
start(); 

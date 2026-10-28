const $=id=>document.getElementById(id),V=$('view');
let C,P={name:'',notes:[],ex:{},msg:''},wt;
function plays(){try{return+localStorage.getItem('m11p')||0}catch(e){return 0}}
function addPlay(){try{localStorage.setItem('m11p',plays()+1)}catch(e){}}
function whisper(t){const w=$('whisper');w.textContent=t;w.classList.add('on');clearTimeout(wt);wt=setTimeout(()=>w.classList.remove('on'),6000)}
function flicker(){document.body.classList.remove('fl');void document.body.offsetWidth;document.body.classList.add('fl')}
function hint(){const l=C.locs.find(x=>x.clues.slice(x.i).some(c=>c.key));if(!l)return false;
 P.notes.push({t:`نسختك القديمة كتبت بخط إيدك: «لسه في حاجة مهمة في ${l.name}».`,cls:'g'});Snd.hiss();whisper('في ورقة ظهرت في الدفتر… ماكتبتهاش.');return true}
function start(){V.innerHTML=`<div class="cover">${Art.cover()}</div><h1>نسختك القديمة</h1><p class="sub">لعبة تحقيق وغموض — كل مرة جريمة مختلفة يولّدها «الصدى»</p><input id="nm" placeholder="اسمك" maxlength="12" aria-label="اسمك"><input id="sd" placeholder="رقم ملف (اختياري — نفس الرقم = نفس القضية)" inputmode="numeric" aria-label="رقم الملف"><button onclick="begin()">افتح ملف جديد</button><p class="by">تطوير: مستر محمد حسين · يُفضّل سماعات وضلمة</p>`}
function begin(){P.name=$('nm').value.trim()||'يا محقق';const s=parseInt($('sd').value)||1000+Math.floor(Math.random()*9000);
 Snd.init();C=build(s,plays());P.notes=[];P.ex={};P.msg='';Snd.creak();brief()}
function brief(){const sus=C.sus.map(s=>s.n).join('، ');
 V.innerHTML=`<header><span>ملف سري #${C.seed}</span><span>${C.sus.length} مشتبه</span></header><p class="story">الساعة ${C.time} قبل الفجر.\nلقوا ${C.victim} ميت في ${C.place}. السبب مش معروف، والسلاح اختفى.\nأربعة كانوا في المكان: ${sus}. واحد منهم القاتل، والباقي بيكذبوا عشان أسباب تانية.\nعندك ${C.max} خطوة قبل الفجر.\nعلى غلاف الملف، بخط إيدك: «هو لسه هنا يا ${P.name}».</p><button onclick="hub()">ابدأ التحقيق</button>`}
function hub(){let h=`<header><span>ملف #${C.seed}</span><span title="الخطوات المتبقية">${'●'.repeat(C.b)}${'○'.repeat(C.max-C.b)}</span></header><p id="msg">${P.msg||'اختار مكان تفتّشه أو مشتبه تفحصه. كل خطوة بتاكل من الليل.'}</p><h3>الأماكن</h3><div class="grid">`;
 C.locs.forEach((l,i)=>h+=`<button class="card" onclick="search(${i})">${Art.scene(l.k)}<b>${l.name}</b><small>${l.i>=l.clues.length?'خلّصت التفتيش':'فتّش'}</small></button>`);
 h+='</div><h3>المشتبه فيهم</h3><div class="grid">';
 C.sus.forEach((s,i)=>h+=`<button class="card" onclick="exam(${i})">${Art.face(s.seed,i)}<b>${s.n}</b><small>${s.job}</small>${P.ex[i]?`<small class="d">حذاء ${s.shoe} · ريحة ${s.perf}<br>${HV[s.hand]}<br>${s.tell}<br>«${s.say}»</small>`:'<small>افحص</small>'}</button>`);
 h+='</div><h3>دفتر الملاحظات</h3><ul>'+(P.notes.map(n=>`<li class="${n.cls||(n.key?'k':'')}">${n.t}</li>`).join('')||'<li>فاضي</li>')+'</ul><button onclick="accuse()">وجّه الاتهام</button>';
 V.innerHTML=h}
function spend(msg,note,snd){if(C.b<=0)return accuse();C.b--;Echo.tick();P.msg=msg;if(note)P.notes.push(note);Snd[snd]();hub();Echo.pulse();if(C.b<=0){P.msg+='\nالفجر طلع. لازم تتهم دلوقتي.';hub();setTimeout(accuse,2500)}else hub()}
function search(i){const l=C.locs[i];if(l.i>=l.clues.length){P.msg='المكان ده فتّشته كله.';return hub()}
 const c=l.clues[l.i++];spend(`${l.name}: ${c.t}`,{t:`${l.name}: ${c.t}`,key:c.key},c.key?'ding':'creak')}
function exam(i){const s=C.sus[i];if(P.ex[i]){P.msg=`فحصت ${s.n} قبل كده.`;return hub()}
 P.ex[i]=1;spend(`فحصت ${s.n}: ${s.tell}. قال: «${s.say}»`,{t:`${s.n}: حذاء ${s.shoe}، ريحة ${s.perf}، ${HV[s.hand]}.`},'hiss')}
function accuse(){V.innerHTML=`<h2>مين القاتل؟</h2><p class="sub">قارن الأدلة في الدفتر بمواصفات كل مشتبه. اتهام واحد بس.</p><div class="grid">`+C.sus.map((s,i)=>`<button class="card" onclick="verdict(${i})">${Art.face(s.seed,i)}<b>${s.n}</b><small>${s.job}</small></button>`).join('')+'</div>'}
function verdict(i){const k=C.sus[C.k],ok=i===C.k;addPlay();Snd.beat();flicker();
 const body=ok?`${k.n} سكت… وبعدين ضحك ضحكة مش بتاعته. اعترف إن السبب «${C.m}»، وإنه استخدم ${C.w}. القضية اتقفلت قبل الفجر.`:`${C.sus[i].n} طلع بريء. وإنت بتبعد، ${k.n} ابتسم بهدوء… وهرب. السبب كان «${C.m}» والسلاح ${C.w}.`;
 V.innerHTML=`<h2>${ok?'القضية اتحلّت':'القاتل هرب'}</h2><p class="story">${body}\n\nوإنت بتقفل الملف، لاحظت إن كل الملاحظات بخط إيدك… وإنت مش فاكر إنك كتبتها. نسختك القديمة حلّت القضية دي قبلك، وسابتلك الملف عشان تكمل مكانها.\nالقضية الجاية بدأت تتكتب لوحدها.</p><p class="stats">${Echo.rep()}<br>رقم الملف: #${C.seed} (ابعته لصاحبك يلعب نفس القضية)<br>قضايا لعبتها: ${plays()}${plays()>=2?' — الصدى بقى يعمّي عليك أكتر':''}</p><button onclick="start()">ملف جديد</button><p class="by">M11 Development — مستر محمد حسين</p>`}
start();

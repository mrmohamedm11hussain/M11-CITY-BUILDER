const C=document.getElementById('c'),X=C.getContext('2d'),W=800,H=440,T=40,$=id=>document.getElementById(id);
const DC=['#ff4d8d','#ffd24d','#4dffb0'],GC=['#7fd4ff','#d0a2ff','#ffc98a','#9dffcf'];
const CH=[{n:'سالم',shirt:'#e5533d',hair:'#3b2417',skin:'#f0c09a',hat:1},{n:'ليلى',shirt:'#9b5de5',hair:'#1d1d2b',skin:'#c68a62',pony:1},{n:'زياد',shirt:'#2ec4b6',hair:'#b5651d',skin:'#f3d2b3'}];
let ch=0,L=0,g=[],plates=[],thorns=[],st={x:0,y:0},ex={x:0,y:0},ghosts=[],rec=[],t=0,P,act=[],idle=0,run=false,done=false,flash=0,parts=[],keys={},last=0,acc=0,ac;
const TR=[0,1,2].map(l=>Array.from({length:9},(_,i)=>({x:i*110+((i*37+l*53)%60)-30,h:150+((i*53+l*29)%90),w:44+((i*17)%22)})));
const FF=Array.from({length:22},(_,i)=>({x:(i*97)%W,y:80+(i*61)%300,p:i}));
function snd(f,d=.12,ty='sine',v=.06){try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),k=ac.createGain();o.type=ty;o.frequency.value=f;k.gain.setValueAtTime(v,ac.currentTime);k.gain.exponentialRampToValueAtTime(.001,ac.currentTime+d);o.connect(k);k.connect(ac.destination);o.start();o.stop(ac.currentTime+d)}catch(e){}}
function glow(c,b){X.shadowColor=c;X.shadowBlur=b}
function burst(x,y,c,n=14){for(let i=0;i<n;i++){const a=Math.random()*6.28,s=1+Math.random()*3;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1,l:1,c})}}
// ===== شخصية بشرية =====
function drawH(c,x,y,f,a,air,q,tint,al){c.save();c.translate(x,y);c.scale(f*.85,.85);c.globalAlpha=al;
 const s=air?4:Math.sin(a)*6,sk=tint?'#e9f6ff':q.skin;
 c.fillStyle=tint||'#2a2f4a';c.fillRect(-6+s,-12,5,12);c.fillRect(1-s,-12,5,12);
 c.fillStyle=tint||q.shirt;c.fillRect(-7,-26,14,15);c.fillRect(-2+s*.6,-25,4,11);
 c.fillStyle=sk;c.beginPath();c.arc(0,-32,7,0,6.28);c.fill();
 c.fillStyle=tint||q.hair;c.beginPath();c.arc(0,-33,7.5,3.14,6.28);c.fill();
 if(q.pony){c.beginPath();c.arc(-9,-30,3.2,0,6.28);c.fill()}
 if(q.hat&&!tint){c.fillStyle='#c0392b';c.fillRect(-8,-39,16,4);c.fillRect(2,-37,9,2)}
 c.fillStyle='#111';c.fillRect(2,-33,2,3);c.restore()}
// ===== مستوى =====
function loadLevel(i){L=i;const m=LEVELS[i].map;g=m.map(r=>r.split(''));plates=[];thorns=[];
 g.forEach((r,y)=>r.forEach((c,x)=>{if(c=='S'){st={x:x*T+20,y:(y+1)*T};r[x]='.'}else if(c=='E'){ex={x:x*T+20,y:y*T+20};r[x]='.'}else if('123'.includes(c)){plates.push({x,y,i:+c-1});r[x]='.'}else if(c=='^')thorns.push({x:x*T+6,y:y*T+22,w:28,h:18})}));
 ghosts=[];done=false;$('lv').textContent=i+1;$('wn').textContent='الغابة المسحورة ·';newRound(true)}
function solid(x,y){if(x<0||x>=20||y<0)return true;if(y>=11)return false;const c=g[y][x];return c=='#'||(c>='a'&&c<='c'&&!act[c.charCodeAt(0)-97])}
function hit(x,y){for(let a=Math.floor((x-10)/T);a<=Math.floor((x+9.9)/T);a++)for(let b=Math.floor((y-32)/T);b<=Math.floor((y-.1)/T);b++)if(solid(a,b))return true;return false}
const box=e=>({x:e.x-10,y:e.y-32,w:20,h:32}),ov=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y,pr=p=>({x:p.x*T+4,y:p.y*T+30,w:32,h:10});
const gpos=q=>q[Math.min(t,q.length-1)];
function calcAct(){const a=[false,false,false];plates.forEach(p=>{const r=pr(p);if(ov(box(P),r)||ghosts.some(q=>ov(box(gpos(q)),r)))a[p.i]=true});return a}
function hint(){const l=LEVELS[L];$('hint').textContent=(ghosts.length&&l.h2)?l.h2:ghosts.length?'نسخك بتفتح الأبواب. كمّل لحد البوابة المضيئة ✨':l.h;$('lp').textContent=ghosts.length+1}
function newRound(first){rec=[];t=0;idle=0;P={x:st.x,y:st.y,vx:0,vy:0,g:true,f:1,a:0};act=calcAct();hint();if(!first){snd(330,.15,'triangle');burst(st.x,st.y-10,'#7dffb0',18)}}
function nextLoop(){if(!run||done)return;if(rec.length>5)ghosts.push(rec);newRound()}
function die(){snd(120,.3,'sawtooth',.08);burst(P.x,P.y-16,'#ff3355',30);flash=18;newRound(true)}
function step(){
 const k=keys,dx=(k.r?1:0)-(k.l?1:0),ins=hit(P.x,P.y);P.vx=dx*3;if(dx)P.f=dx;
 if(k.j&&P.g){P.vy=-9.7;P.g=false;snd(420,.08,'triangle',.04)}
 P.vy=Math.min(P.vy+.5,12);
 for(let i=0;i<Math.abs(P.vx);i++){const nx=P.x+Math.sign(P.vx);if(ins||!hit(nx,P.y))P.x=nx;else break}
 P.g=false;
 for(let i=0,n=Math.ceil(Math.abs(P.vy));i<n;i++){const s=Math.sign(P.vy),ny=P.y+s;if(ins||!hit(P.x,ny))P.y=ny;else{if(s>0)P.g=true;P.vy=0;break}}
 if(dx)P.a+=.35;
 rec.push({x:P.x,y:P.y,f:P.f,a:P.a,g:P.g});t++;
 const b=box(P);if(P.y>H+50||thorns.some(s=>ov(b,s))){die();return}
 const na=calcAct();na.forEach((v,i)=>{if(v!==act[i]){snd(v?660:260,.1,'square',.04);const p=plates.find(q=>q.i==i);if(p)burst(p.x*T+20,p.y*T+34,DC[i],10)}});act=na;
 if(Math.abs(P.x-ex.x)<22&&Math.abs(P.y-16-ex.y)<30){win();return}
 const onp=plates.some(p=>ov(b,pr(p)));if(onp&&!dx&&P.g)idle++;else idle=0;
 if(idle>70||t>=LEVELS[L].t*60){ghosts.push(rec);newRound()}}
function win(){done=true;snd(523,.15,'triangle');setTimeout(()=>snd(784,.25,'triangle'),130);burst(P.x,P.y-16,'#fff',40);
 const lastL=L===LEVELS.length-1,n=ghosts.length+1;
 $('t2').textContent=lastL?'خلّصت الغابة! 🎉':'عدّيت!';
 $('p2').innerHTML=lastL?'كسرت الزمن كله بنسخ من نفسك. شكرًا إنك لعبت.<br><br>من تصميم <b>M11 Development</b><br>المدير: <b>Mr. Mohamed Hussain</b>':'خلّصت المستوى في '+n+(n===1?' جولة':' جولات')+'.';
 $('n2').textContent=lastL?'العب من الأول':'المستوى اللي بعده';
 setTimeout(()=>$('o2').classList.remove('off'),700)}
// ===== رسم =====
function draw(){const tm=performance.now()/1000;
 let gr=X.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#0b2a2a');gr.addColorStop(.6,'#0f3a30');gr.addColorStop(1,'#07160f');X.shadowBlur=0;X.fillStyle=gr;X.fillRect(0,0,W,H);
 let mg=X.createRadialGradient(650,70,4,650,70,90);mg.addColorStop(0,'#fffbe0');mg.addColorStop(.16,'#fff3b0');mg.addColorStop(.17,'#fff3b030');mg.addColorStop(1,'#0000');X.fillStyle=mg;X.fillRect(540,0,260,170);
 TR.forEach((a,l)=>{X.fillStyle=['#123a30','#0e2c24','#0a2019'][l];a.forEach(q=>{const bx=q.x+Math.sin(tm*.6+q.x)*(l+1)*.8,by=330+l*40;for(let k=0;k<3;k++){const ty=by-q.h+k*q.h*.3,w=q.w*(.6+k*.35);X.beginPath();X.moveTo(bx,ty);X.lineTo(bx+w,ty+q.h*.42);X.lineTo(bx-w,ty+q.h*.42);X.fill()}X.fillRect(bx-5,by-q.h*.2,10,q.h*.2+80)})});
 X.fillStyle='rgba(180,255,220,.05)';X.fillRect(0,300+Math.sin(tm)*10,W,70);
 FF.forEach(f=>{const a=.4+.6*Math.abs(Math.sin(tm*1.3+f.p));X.save();glow('#d8ff6a',10);X.fillStyle='rgba(230,255,120,'+a+')';X.fillRect(f.x+Math.sin(tm*.5+f.p)*25,f.y+Math.cos(tm*.4+f.p)*18,3,3);X.restore()});
 for(let y=0;y<11;y++)for(let x=0;x<20;x++){const c=g[y][x],px=x*T,py=y*T;
  if(c=='#'){X.fillStyle='#2b1d14';X.fillRect(px,py,T,T);if((x*7+y*13)%4==0){X.fillStyle='#3a281b';X.fillRect(px+8,py+14,10,6)}if(y==0||g[y-1][x]!='#'){X.fillStyle='#3f9b4e';X.fillRect(px,py,T,7);X.fillStyle='#63c76d';X.fillRect(px,py,T,3)}}
  else if(c=='^'){X.save();glow('#ff3b7a',10);X.fillStyle='#d1285f';for(let k=0;k<3;k++){X.beginPath();X.moveTo(px+k*13,py+T);X.lineTo(px+6+k*13,py+16);X.lineTo(px+13+k*13,py+T);X.fill()}X.restore()}
  else if(c>='a'&&c<='c'){const i=c.charCodeAt(0)-97,o=act[i];X.save();glow(DC[i],o?4:14);if(o){X.strokeStyle=DC[i]+'55';X.strokeRect(px+10,py,20,T)}else{X.fillStyle='#5a3a1e';X.fillRect(px+8,py,24,T);X.fillStyle=DC[i];X.fillRect(px+8,py,3,T);X.fillRect(px+29,py,3,T);X.fillRect(px+8,py+18,24,3)}X.restore()}}
 plates.forEach(p=>{const o=act[p.i],px=p.x*T,py=p.y*T;X.save();glow(DC[p.i],o?26:8);X.fillStyle='#4b4f5a';X.fillRect(px+4,py+34,32,6);X.fillStyle=o?DC[p.i]:DC[p.i]+'66';X.fillRect(px+8,py+(o?35:31),24,o?3:4);X.restore()});
 const pu=1+Math.sin(tm*4)*.12;X.save();glow('#ffe58a',28);for(let k=0;k<3;k++){X.strokeStyle='rgba(255,240,170,'+(.9-k*.25)+')';X.lineWidth=2;X.beginPath();X.ellipse(ex.x,ex.y,(8+k*5)*pu,(16+k*7)*pu,0,0,6.28);X.stroke()}X.restore();
 ghosts.forEach((q,k)=>{const e=gpos(q);X.save();glow(GC[k%4],14);drawH(X,e.x,e.y,e.f,e.a,!e.g,CH[ch],GC[k%4],.62);X.restore()});
 drawH(X,P.x,P.y,P.f,P.a,!P.g,CH[ch],null,1);
 if(idle>0){X.strokeStyle='#fff';X.lineWidth=3;X.beginPath();X.arc(P.x,P.y-16,24,-1.57,-1.57+idle/70*6.28);X.stroke()}
 parts.forEach(p=>{X.globalAlpha=Math.max(p.l,0);X.fillStyle=p.c;X.fillRect(p.x-2,p.y-2,4,4)});X.globalAlpha=1;
 if(flash>0){X.fillStyle='rgba(255,40,70,'+flash/40+')';X.fillRect(0,0,W,H);flash--}
 X.fillStyle='#ffffff30';X.font='11px Cairo,sans-serif';X.textAlign='left';X.fillText('M11 Development',10,H-8);
 $('fill').style.transform='scaleX('+Math.max(0,1-t/(LEVELS[L].t*60))+')'}
function loop(ts){const dt=Math.min(ts-last,100);last=ts;
 if(run&&!done){acc+=dt;while(acc>=1000/60){step();acc-=1000/60;if(done)break}}
 parts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.05;p.vx*=.96;p.l-=.025});parts=parts.filter(p=>p.l>0);
 draw();requestAnimationFrame(loop)}
// ===== تحكم =====
const KM={ArrowLeft:'l',a:'l',ArrowRight:'r',d:'r',ArrowUp:'j',w:'j',' ':'j'};
addEventListener('keydown',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if(KM[k]){keys[KM[k]]=1;e.preventDefault()}if(k==='Enter')nextLoop();if(k==='r')loadLevel(L)});
addEventListener('keyup',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if(KM[k])keys[KM[k]]=0});
document.querySelectorAll('#pad button').forEach(b=>{const k=b.dataset.k,on=e=>{e.preventDefault();keys[k]=1},off=()=>keys[k]=0;b.addEventListener('pointerdown',on);['pointerup','pointerleave','pointercancel'].forEach(v=>b.addEventListener(v,off))});
$('nx').onclick=nextLoop;$('rs').onclick=()=>loadLevel(L);
$('go').onclick=()=>{$('o1').classList.add('off');run=true;snd(440,.2,'triangle')};
$('n2').onclick=()=>{$('o2').classList.add('off');loadLevel(L===LEVELS.length-1?0:L+1)};
const chs=$('chs');CH.forEach((q,i)=>{const b=document.createElement('button');b.className='ch'+(i?'':' on');const cv=document.createElement('canvas');cv.width=56;cv.height=64;const k=cv.getContext('2d');k.scale(1.3,1.3);drawH(k,21,48,1,0,false,q,null,1);b.append(cv,q.n);b.onclick=()=>{ch=i;[...chs.children].forEach((x,j)=>x.classList.toggle('on',j==i));snd(500+i*100,.1)};chs.append(b)});
loadLevel(0);requestAnimationFrame(t=>{last=t;loop(t)});

/* ===== محرك اللعبة ===== */
const $=id=>document.getElementById(id),cv=$('c'),cx=cv.getContext('2d');
const W=960,H=540,TS=40,GY=400,KEY='m11_oldversion_v2',SD=50;
cv.width=W;cv.height=H;
function fit(){const s=Math.min(innerWidth/W,innerHeight/H);cv.style.width=W*s+'px';cv.style.height=H*s+'px'}
addEventListener('resize',fit);fit();
let S={ch:null,max:0,best:[],mute:false,seen:-1};
try{Object.assign(S,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};

/* الصوت */
let AC=null,mi=0,state='load';
function snd(f,d,type,v,sl){if(S.mute||!AC)return;try{const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=type||'square';o.frequency.setValueAtTime(f,t);if(sl)o.frequency.exponentialRampToValueAtTime(Math.max(40,f+sl),t+d);g.gain.setValueAtTime(v||.06,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(AC.destination);o.start();o.stop(t+d)}catch(e){}}
setInterval(()=>{if(state!='play'||S.mute||!AC)return;const sc=[0,3,5,7,10,12,10,7,5,3,0,-2],b=[262,247,294,220,233,196][wi]/2,s=sc[mi%sc.length];snd(b*Math.pow(2,s/12)*2,.28,'triangle',.03);if(mi%4==0)snd(b/2,.5,'sine',.05);mi++},300);

/* المراحل */
let lv=0,wi=0,SO=[],GM=[],EN=[],DC=[],FX=0,LW=0,P,HP=3,GOT=0,SH=1,SAFE,cam=0,tm=0,PT=[],hist=[],shake=0;
function rng(s){return()=>(s=(s*1664525+1013904223)>>>0)/4294967296}
const MON={slime:{w:34,h:28},hop:{w:30,h:30},bat:{w:34,h:24},spike:{w:34,h:22}};
function build(n){
 const R=rng(n*7919+13),d=n/(N-1),w=WORLDS[n/PER|0];SO=[];GM=[];EN=[];DC=[];let x=0;
 const run=len=>{SO.push({x:x,y:GY,w:len*TS,h:300,t:'g'});if(R()<.75)DC.push({x:x+(1+R()*(len-2))*TS,k:R()})};
 const mon=(t,sx,len)=>{const m=MON[t],e={t:t,x:sx+2*TS,y:GY-m.h,w:m.w,h:m.h,a:sx+TS*.5,b:sx+(len-.5)*TS,d:1,s:(t=='hop'?.7:1)+d*.8,on:1,vy:0};
  if(t=='bat'){e.a=sx;e.b=sx+len*TS;e.base=GY-125;e.y=e.base}
  if(t=='spike'){e.x=sx+(2+(R()*(len-4)|0))*TS+3;e.s=0}EN.push(e)};
 run(9);x=9*TS;
 const cnt=8+(n*.5|0);
 for(let k=0;k<cnt;k++){
  const g=2+(R()<.25+d*.5?1:0);
  for(let i=0;i<3;i++)GM.push({x:x+(i+.5)*g*TS/3,y:GY-75-Math.sin((i+.5)/3*Math.PI)*55});
  x+=g*TS;const len=5+(R()*5|0);run(len);const sx=x,f=R();
  if(R()<.07)GM.push({x:sx+len*TS/2,y:GY-40,h:1});
  if(f<.25){const h=(R()<.3+d*.4?2:1)*TS,c=2+(R()*(len-4)|0);SO.push({x:sx+c*TS,y:GY-h,w:TS,h:h,t:'r'});GM.push({x:sx+c*TS+20,y:GY-h-45})}
  else if(f<.62){const t=w.mon[R()*w.mon.length|0];if(t=='bat'||t=='spike'||len>=6)mon(t,sx,len);else mon('bat',sx,len);
   if(t=='spike')GM.push({x:EN[EN.length-1].x+17,y:GY-85})}
  else if(f<.85){const c=1+(R()*(len-4)|0);SO.push({x:sx+c*TS,y:GY-100,w:3*TS,h:18,t:'p'});for(let i=0;i<3;i++)GM.push({x:sx+c*TS+20+i*TS,y:GY-135})}
  else for(let i=0;i<4;i++)GM.push({x:sx+(1+i*(len-2)/4)*TS+10,y:GY-35});
  x+=len*TS}
 run(10);FX=x+5*TS;LW=x+10*TS}

/* التحكم */
const K={l:0,r:0,j:0},km={ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r',ArrowUp:'j',KeyW:'j',Space:'j'};
addEventListener('keydown',e=>{if(km[e.code]){K[km[e.code]]=1;e.preventDefault()}});
addEventListener('keyup',e=>{if(km[e.code]){K[km[e.code]]=0;e.preventDefault()}});
document.querySelectorAll('#tc button').forEach(b=>{const k=b.dataset.k;
 b.addEventListener('pointerdown',e=>{e.preventDefault();K[k]=1});
 ['pointerup','pointercancel','pointerleave'].forEach(t=>b.addEventListener(t,()=>K[k]=0))});
addEventListener('contextmenu',e=>e.preventDefault());
const portrait=()=>matchMedia('(pointer:coarse)').matches&&innerHeight>innerWidth;

/* المنطق */
function hit(p,ax){for(const r of SO){
 if(r.x>p.x+p.w+10||r.x+r.w<p.x-10)continue;
 if(p.x<r.x+r.w&&p.x+p.w>r.x&&p.y<r.y+r.h&&p.y+p.h>r.y){
  if(ax=='x'){p.x=p.vx>0?r.x-p.w:r.x+r.w;p.vx=0}
  else{if(p.vy>0){p.y=r.y-p.h;p.on=true;if(r.t=='g'&&p.x>r.x+30&&p.x+p.w<r.x+r.w-30)SAFE={x:p.x,y:p.y}}else p.y=r.y+r.h;p.vy=0}}}}
function burst(x,y,c){for(let i=0;i<9;i++)PT.push({x:x,y:y,vx:(Math.random()-.5)*6,vy:-Math.random()*5,l:30,c:c})}
function hud(){$('hH').textContent='❤️'.repeat(HP)+'🖤'.repeat(3-HP);$('hG').textContent='💎 '+GOT;$('hS').textContent=SH?'🛡️ الظل':'';$('hL').textContent=WORLDS[wi].e+' '+WORLDS[wi].n+' '+(lv%PER+1)+'/'+PER}
function hurt(fall){
 if(P.inv>0&&!fall)return;
 if(!fall&&SH){SH=0;P.inv=70;P.vy=-7;burst(P.x+14,P.y+20,'#b99cff');snd(520,.25,'sine',.07,-200);hud();return}
 HP--;shake=12;snd(180,.3,'sawtooth',.07,-120);hud();
 if(HP<=0){state='over';show('lose');return}
 if(fall){P.x=SAFE.x;P.y=SAFE.y-2;P.vx=0;P.vy=0;P.inv=90;hist=[]}else{P.inv=100;P.vy=-8;P.vx=-P.face*5}}
function win(){
 state='win';snd(660,.15,'triangle',.08,200);setTimeout(()=>snd(990,.3,'triangle',.08,300),150);
 S.best[lv]=Math.max(S.best[lv]||0,GOT);S.max=Math.max(S.max,Math.min(lv+1,N-1));save();
 $('ws').textContent='★'.repeat(HP)+'☆'.repeat(3-HP);$('wg').textContent='💎 جمعت '+GOT+' من '+GM.filter(g=>!g.h).length;
 const last=lv==N-1;$('wt').textContent=last?ENDING:'أحسنت! أنهيت المرحلة';$('wt').style.fontSize=last?'20px':'30px';$('bNext').style.display=last?'none':'';show('win')}
function step(){
 tm+=1/60;const p=P;const dir=(K.r?1:0)-(K.l?1:0);
 p.vx+=(dir*4.4-p.vx)*.3;if(dir)p.face=dir;
 if(K.j&&!p.jh)p.jb=8;p.jh=K.j;if(p.jb>0)p.jb--;
 p.coy=p.on?7:p.coy-1;
 if(p.jb>0&&p.coy>0){p.vy=-13.2;p.jb=0;p.coy=0;p.on=false;snd(420,.15,'square',.05,300)}
 if(!K.j&&p.vy<-4)p.vy+=.9;
 p.vy=Math.min(p.vy+.6,14);
 p.x+=p.vx;hit(p,'x');p.y+=p.vy;p.on=false;hit(p,'y');
 if(p.x<0){p.x=0;p.vx=0}
 if(p.inv>0)p.inv--;if(shake>0)shake--;
 if(p.y>H+60)hurt(true);
 hist.push({x:p.x,y:p.y,f:p.face,on:p.on});if(hist.length>SD+5)hist.shift();
 for(const e of EN){if(!e.on)continue;
  if(e.t!='spike'){e.x+=e.d*e.s;if(e.x<e.a){e.x=e.a;e.d=1}if(e.x+e.w>e.b){e.x=e.b-e.w;e.d=-1}}
  if(e.t=='bat')e.y=e.base+Math.sin(tm*3+e.a)*28;
  if(e.t=='hop'){e.vy+=.5;e.y+=e.vy;if(e.y>=GY-e.h){e.y=GY-e.h;e.vy=0;if(Math.random()<.03)e.vy=-9}}
  if(p.x<e.x+e.w&&p.x+p.w>e.x&&p.y<e.y+e.h&&p.y+p.h>e.y){
   if(e.t!='spike'&&p.vy>1&&p.y+p.h-e.y<24){e.on=0;p.vy=-9.5;burst(e.x+17,e.y+12,'#e0525b');snd(300,.12,'square',.06,300)}else hurt()}}
 const sh=hist.length>SD?hist[hist.length-SD]:null;
 for(const g of GM){if(g.got)continue;
  if(Math.hypot(p.x+14-g.x,p.y+22-g.y)<28){g.got=1;if(g.h){HP=Math.min(3,HP+1);snd(520,.2,'triangle',.07,500)}else{GOT++;snd(880,.1,'triangle',.07,500)}burst(g.x,g.y,g.h?'#ff6b8a':'#35e0ff');hud()}
  else if(sh&&!g.h&&Math.hypot(sh.x+14-g.x,sh.y+22-g.y)<30){g.got=1;GOT++;burst(g.x,g.y,'#b99cff');snd(1040,.1,'sine',.05,300);hud()}}
 PT.forEach(q=>{q.x+=q.vx;q.vy+=.3;q.y+=q.vy;q.l--});PT=PT.filter(q=>q.l>0);
 if(p.x+p.w>FX&&state=='play')win();
 cam+=(p.x-W*.4-cam)*.12;cam=Math.max(0,Math.min(LW-W,cam))}

/* الرسم */
const circ=(x,y,r)=>{cx.beginPath();cx.arc(x,y,r,0,7);cx.fill()};
function drawChar(c,ch,x,y,face,leg,sh){
 c.save();c.translate(x+14,y);c.scale(face,1);const g=ch=='girl',hc=g?'#2b1b12':'#6b3f1d',q=v=>sh?'#150a2a':v;
 if(sh)c.globalAlpha=.6;
 c.fillStyle=q('#2b2f45');c.fillRect(-9+leg,34,7,10);c.fillRect(2-leg,34,7,10);
 c.fillStyle=q(g?'#ec4899':'#3b82f6');
 if(g){c.beginPath();c.moveTo(-8,22);c.lineTo(8,22);c.lineTo(13,38);c.lineTo(-13,38);c.fill()}else{c.beginPath();c.roundRect(-10,22,20,15,4);c.fill()}
 c.fillStyle=q(hc);if(g){c.beginPath();c.arc(-12,14,6,0,7);c.fill()}
 c.fillStyle=q('#ffd2a8');c.beginPath();c.arc(0,13,11,0,7);c.fill();
 c.fillStyle=q(hc);c.beginPath();c.arc(0,12,12,Math.PI,0);c.fill();
 c.fillStyle=sh?'#9cf':'#222';c.beginPath();c.arc(5,14,2,0,7);c.fill();c.restore()}
function bg(){
 const th=WORLDS[wi];let g=cx.createLinearGradient(0,0,0,H);g.addColorStop(0,th.sky[0]);g.addColorStop(1,th.sky[1]);cx.fillStyle=g;cx.fillRect(0,0,W,H);
 if(wi==3||wi==5){cx.fillStyle='#fff9';for(let i=0;i<40;i++)circ(i*137%W,i*61%300,1+(i%3)*.6)}
 cx.fillStyle=wi==3||wi==5?'#f3eaff':'#fff6b0';circ(780,90,36);
 for(let l=0;l<2;l++){cx.fillStyle=th.hill[l];cx.beginPath();cx.moveTo(0,H);const off=cam*(.15+.2*l);for(let x=0;x<=W;x+=20)cx.lineTo(x,340-l*30-Math.sin((x+off)/(140-l*40)+l*2)*(40+l*20));cx.lineTo(W,H);cx.fill()}
 cx.fillStyle='#ffffff55';
 for(let i=0;i<4;i++){const x=(((i*290-cam*.1+tm*8)%(W+200))+W+200)%(W+200)-100;cx.beginPath();cx.ellipse(x,70+i*38%90,50,16,0,0,7);cx.fill()}
 cx.fillStyle=th.fly;for(let i=0;i<16;i++){const x=((i*173-cam*.4)%W+W)%W,y=200+(i*53)%220+Math.sin(tm*1.5+i)*12;cx.globalAlpha=.5+.4*Math.sin(tm*3+i);circ(x,y,2);}cx.globalAlpha=1}
function deco(d){const x=d.x,y=GY,t=WORLDS[wi].deco;
 if(t=='tree'){cx.fillStyle='#6b4a2e';cx.fillRect(x-5,y-50,10,50);cx.fillStyle='#2f9e4f';circ(x,y-62,26);circ(x-16,y-46,18);circ(x+16,y-46,18)}
 else if(t=='cactus'){cx.fillStyle='#3f9a4a';cx.fillRect(x-7,y-62,14,62);cx.fillRect(x-22,y-44,16,8);cx.fillRect(x-22,y-56,8,20);cx.fillRect(x+6,y-36,16,8);cx.fillRect(x+14,y-48,8,20)}
 else if(t=='pine'){cx.fillStyle='#2e6f55';for(let i=0;i<3;i++){cx.beginPath();cx.moveTo(x-24+i*5,y-14-i*22);cx.lineTo(x,y-50-i*22);cx.lineTo(x+24-i*5,y-14-i*22);cx.fill()}cx.fillStyle='#fff';cx.fillRect(x-6,y-88,12,6)}
 else if(t=='mush'){cx.fillStyle='#d9c8ff';cx.fillRect(x-4,y-22,8,22);cx.fillStyle=d.k<.5?'#b86bff':'#4de3d1';cx.beginPath();cx.ellipse(x,y-24,20,14,0,Math.PI,0);cx.fill()}
 else if(t=='pillar'){cx.fillStyle='#d8c6e4';cx.fillRect(x-12,y-80,24,80);cx.fillRect(x-18,y-86,36,8);cx.fillStyle='#b79ac8';cx.fillRect(x-4,y-76,3,72)}
 else{cx.fillStyle=d.k<.5?'#ff6b8a':'#ffb3c6';cx.beginPath();cx.moveTo(x-14,y);cx.lineTo(x-6,y-60);cx.lineTo(x+2,y);cx.fill();cx.beginPath();cx.moveTo(x-2,y);cx.lineTo(x+10,y-44);cx.lineTo(x+18,y);cx.fill()}}
function drawEn(e){const sq=Math.sin(tm*8+e.x)*2,X=e.x,Y=e.y;
 if(e.t=='spike'){cx.fillStyle='#c9ced6';for(let i=0;i<3;i++){cx.beginPath();cx.moveTo(X+i*11.3,Y+22);cx.lineTo(X+i*11.3+5.6,Y);cx.lineTo(X+i*11.3+11.3,Y+22);cx.fill()}return}
 if(e.t=='bat'){const f=Math.sin(tm*14)*10;cx.fillStyle='#5b3a8a';cx.beginPath();cx.moveTo(X+17,Y+12);cx.lineTo(X-6,Y-4+f);cx.lineTo(X+6,Y+14);cx.lineTo(X+17,Y+20);cx.lineTo(X+28,Y+14);cx.lineTo(X+40,Y-4+f);cx.fill();cx.beginPath();cx.ellipse(X+17,Y+13,10,10,0,0,7);cx.fill();cx.fillStyle='#ff5d5d';circ(X+13,Y+11,2.5);circ(X+21,Y+11,2.5);return}
 cx.fillStyle=e.t=='hop'?'#4cc36b':'#e0525b';cx.beginPath();cx.ellipse(X+e.w/2,Y+e.h/2+3,e.w/2+sq,e.h/2-1-sq*.4,0,0,7);cx.fill();
 cx.fillStyle='#fff';circ(X+e.w/2-7,Y+e.h/2,4.5);circ(X+e.w/2+7,Y+e.h/2,4.5);cx.fillStyle='#111';circ(X+e.w/2-7+e.d*1.5,Y+e.h/2,2);circ(X+e.w/2+7+e.d*1.5,Y+e.h/2,2)}
function draw(){
 if(!SO.length)return;cx.clearRect(0,0,W,H);bg();
 const th=WORLDS[wi];cx.save();cx.translate(-Math.round(cam)+(shake?(Math.random()-.5)*shake:0),shake?(Math.random()-.5)*shake:0);
 for(const d of DC)if(d.x>cam-60&&d.x<cam+W+60)deco(d);
 for(const r of SO){if(r.x+r.w<cam||r.x>cam+W)continue;
  if(r.t=='r'){cx.fillStyle=th.rock;cx.beginPath();cx.moveTo(r.x+4,r.y+r.h);cx.lineTo(r.x,r.y+r.h*.35);cx.lineTo(r.x+10,r.y);cx.lineTo(r.x+r.w-10,r.y+4);cx.lineTo(r.x+r.w,r.y+r.h*.4);cx.lineTo(r.x+r.w-4,r.y+r.h);cx.closePath();cx.fill();cx.strokeStyle='#fff4';cx.lineWidth=2;cx.stroke()}
  else{cx.fillStyle=th.g;cx.fillRect(r.x,r.y,r.w,r.h);cx.fillStyle=th.top;cx.fillRect(r.x,r.y,r.w,r.t=='g'?10:6)}}
 for(const g of GM){if(g.got||g.x<cam-20||g.x>cam+W+20)continue;
  const bob=Math.sin(tm*3+g.x)*4;
  if(g.h){cx.font='26px serif';cx.textAlign='center';cx.fillText('❤️',g.x,g.y+bob+8);continue}
  const sx=Math.abs(Math.cos(tm*2+g.x*.01))*.6+.4;
  cx.save();cx.translate(g.x,g.y+bob);cx.scale(sx,1);cx.fillStyle='#35e0ff';cx.beginPath();cx.moveTo(0,-13);cx.lineTo(10,0);cx.lineTo(0,13);cx.lineTo(-10,0);cx.closePath();cx.fill();cx.fillStyle='#fff9';cx.beginPath();cx.moveTo(0,-13);cx.lineTo(-10,0);cx.lineTo(0,0);cx.fill();cx.restore()}
 for(const e of EN)if(e.on)drawEn(e);
 cx.fillStyle='#ddd';cx.fillRect(FX,GY-120,5,120);cx.fillStyle='#ff4d6d';cx.beginPath();cx.moveTo(FX+5,GY-120);cx.lineTo(FX+50,GY-105+Math.sin(tm*5)*4);cx.lineTo(FX+5,GY-90);cx.fill();
 const sh=hist.length>SD?hist[hist.length-SD]:null;
 if(sh&&Math.abs(sh.x-P.x)>18)drawChar(cx,S.ch,sh.x,sh.y+Math.sin(tm*4)*2,sh.f,sh.on?Math.sin(tm*14)*4:0,1);
 if(!(P.inv>0&&((P.inv/5)|0)%2))drawChar(cx,S.ch,P.x,P.y,P.face,P.on?Math.sin(tm*14)*4*Math.min(1,Math.abs(P.vx)):0);
 for(const q of PT){cx.fillStyle=q.c;cx.fillRect(q.x,q.y,5,5)}
 cx.restore()}

/* القوائم */
function show(id){document.querySelectorAll('.ov').forEach(o=>o.classList.toggle('on',o.id==id))}
function startLevel(n){
 lv=n;wi=n/PER|0;build(n);P={x:60,y:GY-44,w:28,h:44,vx:0,vy:0,on:true,face:1,inv:0,jb:0,coy:0,jh:0};SAFE={x:60,y:GY-44};
 HP=3;GOT=0;SH=1;cam=0;PT=[];hist=[];state='play';show('');$('hud').classList.add('on');document.body.classList.add('play');hud()}
function menu(){
 state='menu';$('hud').classList.remove('on');document.body.classList.remove('play');show('menu');
 $('cb').classList.toggle('s',S.ch=='boy');$('cg').classList.toggle('s',S.ch=='girl');
 $('bStart').disabled=!S.ch;$('bStart').textContent=S.max>0?'متابعة المغامرة ◀':'ابدأ المغامرة ◀';
 const box=$('lv');box.innerHTML='';
 for(let i=0;i<N;i++){const b=document.createElement('button'),ok=i<=S.max;b.className=ok?'ok':'';b.disabled=!ok||!S.ch;b.textContent=ok?(i%PER==0?WORLDS[i/PER|0].e:'')+(i+1)+(S.best[i]!=null?'✓':''):'🔒';b.onclick=()=>begin(i);box.appendChild(b)}}
function begin(i){
 AC=AC||new(window.AudioContext||window.webkitAudioContext)();AC.resume();
 if(i%PER==0&&S.seen<i/PER){const w=WORLDS[i/PER|0];$('se').textContent=w.e;$('st').textContent=w.n;$('sx').textContent=w.story;show('story');$('bGo').onclick=()=>{S.seen=i/PER;save();startLevel(i)}}
 else startLevel(i)}
function pick(ch){S.ch=ch;save();menu()}
$('cb').onclick=()=>pick('boy');$('cg').onclick=()=>pick('girl');
$('bStart').onclick=()=>begin(Math.min(S.max,N-1));
$('bReset').onclick=()=>{if(confirm('متأكد إنك عايز تمسح التقدم؟')){S.max=0;S.best=[];S.seen=-1;save();menu()}};
$('bNext').onclick=()=>begin(lv+1);$('bRe1').onclick=$('bRe2').onclick=()=>startLevel(lv);
$('bMn1').onclick=$('bMn2').onclick=$('bM').onclick=menu;
$('bS').onclick=()=>{S.mute=!S.mute;$('bS').textContent=S.mute?'🔇':'🔊';save()};
$('bS').textContent=S.mute?'🔇':'🔊';
const c1=$('pb1').getContext('2d'),c2=$('pg1').getContext('2d');
c1.scale(2.4,2.4);c2.scale(2.4,2.4);drawChar(c1,'boy',22,16,1,0);drawChar(c2,'girl',22,16,1,0);
let last=0,acc=0;
function loop(ts){requestAnimationFrame(loop);const dt=Math.min(.1,(ts-last)/1000||0);last=ts;
 if(state=='play'&&!portrait()){acc+=dt;while(acc>=1/60){step();acc-=1/60}}
 draw()}
requestAnimationFrame(loop);
let pr=0;const iv=setInterval(()=>{pr+=4+Math.random()*6;if(pr>=100){pr=100;clearInterval(iv);setTimeout(menu,250)}$('pc').textContent=Math.floor(pr)+'%';$('pbar').style.width=pr+'%'},60);

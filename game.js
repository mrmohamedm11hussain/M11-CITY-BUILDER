(function(){
var W=40,H=40,PL=10,NP=4,KEY="m11-3d-v3";
var TY={
 road:{n:"طريق",i:"🛣️",c:10,u:.4,col:0x39424f},
 R:{n:"سكني",i:"🏠",c:30,u:0,col:0x8fd19e},
 C:{n:"تجاري",i:"🏪",c:40,u:0,col:0x8fb8f0},
 I:{n:"صناعي",i:"🏭",c:50,u:0,col:0xf0d48a},
 power:{n:"كهرباء",i:"⚡",c:250,u:10,col:0x777777},
 park:{n:"حديقة",i:"🌳",c:40,u:1.5,col:0x6cc06f},
 svc:{n:"إطفاء",i:"🚒",c:150,u:6,col:0xdddddd},
 school:{n:"مدرسة",i:"🏫",c:180,u:8,col:0xf2e2b0},
 solar:{n:"طاقة شمسية",i:"☀️",c:200,u:2,col:0x3d5a80},
 tree:{n:"شجرة",i:"🌲",c:15,u:0,col:0xb9d9a0},
 police:{n:"شرطة",i:"🚓",c:150,u:6,col:0xcfd8f0},
 hospital:{n:"مستشفى",i:"🏥",c:300,u:12,col:0xf5f5f5},
 stadium:{n:"استاد",i:"🏟️",c:700,u:20,col:0x9aa5b1},
 airport:{n:"مطار",i:"✈️",c:1500,u:40,col:0x8d99a6},
 expand:{n:"توسعة",i:"🗺️",c:0,u:0},
 highway:{n:"طريق سريع",i:"🛤️",c:25,u:.8,col:0x2b323d},
 parking:{n:"موقف",i:"🅿️",c:60,u:1,col:0x586272},
 mall:{n:"مول",i:"🏬",c:450,u:12,col:0xc9d6ff},
 office:{n:"أبراج مكاتب",i:"🏢",c:400,u:10,col:0x9fb4c9},
 farm:{n:"مزرعة",i:"🌾",c:120,u:2,col:0xd9c27a},
 wind:{n:"رياح",i:"🌬️",c:220,u:3,col:0xdfe9f2},
 water:{n:"برج مياه",i:"💧",c:160,u:4,col:0xcfe8ff},
 university:{n:"جامعة",i:"🎓",c:500,u:25,col:0xe8d9c0},
 library:{n:"مكتبة",i:"📚",c:200,u:6,col:0xe8d9c0},
 fountain:{n:"نافورة",i:"⛲",c:60,u:1,col:0x8fd1e8},
 cinema:{n:"سينما",i:"🎬",c:250,u:8,col:0x6b4d8a},
 museum:{n:"متحف",i:"🏛️",c:600,u:15,col:0xe6dcc8},
 amusement:{n:"ملاهي",i:"🎡",c:900,u:30,col:0xff8fa3},
 bus:{n:"موقف أتوبيس",i:"🚌",c:80,u:3,col:0xf2b134},
 metro:{n:"مترو",i:"🚇",c:400,u:15,col:0x4a90d9},
 train:{n:"قطار",i:"🚆",c:600,u:22,col:0x7b8794},
 port:{n:"ميناء",i:"⚓",c:1200,u:35,col:0x5f7d95},
 hotel:{n:"فندق",i:"🏨",c:500,u:18,col:0xf0e3d0},
 resort:{n:"منتجع",i:"🏖️",c:800,u:25,col:0x7fd1c7},
 bank:{n:"بنك",i:"🏦",c:600,u:10,col:0xd9e4d0},
 cityhall:{n:"مجلس المدينة",i:"🏛️",c:800,u:0,col:0xe9e0d0},
 bull:{n:"هدم",i:"🧨",c:0,u:0},
 cam:{n:"تحريك",i:"🖐️",c:0,u:0}
};
var HP={park:[3,25],tree:[.5,10],fountain:[1.5,10],svc:[7,20],police:[7,20],hospital:[9,20],school:[6,18],university:[8,16],library:[5,10],stadium:[8,15],cinema:[4,12],museum:[5,12],amusement:[5,15],bus:[1.5,10],metro:[4,16],train:[4,12],water:[3,9],parking:[.5,5],power:[-2,-10],airport:[-3,-9],port:[-3,-9]};
var AT={airport:60,museum:25,amusement:40,resort:30,stadium:20,cinema:5,fountain:3,train:10,metro:5},BD={hotel:50,resort:30};
var DESC={R:"سكن، بيكبر لحد ٣ مستويات",C:"محلات وفرص شغل",I:"مصانع: دخل كبير وتلوّث",road:"يوصل المباني",highway:"طريق سريع (بيوصل زي الطريق)",parking:"+رضا بسيط",mall:"دخل تجاري كبير",office:"دخل ثابت",farm:"دخل صغير",power:"كهرباء ٢٥ وحدة، بتلوّث",solar:"كهرباء نظيفة ١٠ وحدات",wind:"كهرباء نظيفة ١٥ وحدة",water:"+رضا",svc:"إطفاء: بيحمي من الحرائق",police:"+رضا، بيقلل الجرائم",hospital:"+رضا كبير",school:"+رضا، لازم للمستوى ٣",university:"+رضا ودخل ضرائب",library:"+رضا",park:"+رضا",tree:"+رضا بسيط",fountain:"+رضا وسياحة بسيطة",cinema:"+رضا",museum:"+رضا وسياحة",amusement:"سياحة كبيرة و+رضا",stadium:"+رضا وسياحة",bus:"+رضا",metro:"+رضا وسياحة",train:"+رضا، بيسهّل وصول السياح",airport:"سياحة كبيرة، ضوضاء",port:"تجارة بتعتمد على الصناعة",hotel:"أسرّة للسياح",resort:"سياحة + أسرّة",bank:"+٨٪ ضرائب لكل بنك (لحد ٣)",cityhall:"-٨٪ من المصروفات",cam:"اسحب لتحريك الكاميرا",bull:"هدم واسترجاع ٥٠٪",expand:"اشتري قطعة أرض جديدة"};
var ZONE={R:1,C:1,I:1},MON=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
var S,tool="road",speed=1,cur,tax=0,exp=0,tour=0,dm={R:0,C:0,I:0},confirmReset=false;
var $=function(i){return document.getElementById(i)};
var fmt=function(n){return Math.round(n).toLocaleString("ar-EG")};
var clamp=function(v,a,b){return Math.max(a===undefined?-1:a,Math.min(b===undefined?1:b,v))};

var muted=false,ac=null;
function snd(f,d){if(muted)return;try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();var o=ac.createOscillator(),g=ac.createGain();d=d||.12;o.type="triangle";o.frequency.value=f;g.gain.value=.05;o.connect(g);g.connect(ac.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+d);o.stop(ac.currentTime+d)}catch(e){}}
function fresh(){S={cells:new Array(W*H).fill(null),money:5000,month:0,rate:9,pop:0,happy:70,ms:0,debt:0,own:[0,0,0,0,0,1,1,0,0,1,1,0,0,0,0,0],ex:0}}
function load(){try{var s=JSON.parse(localStorage.getItem(KEY));if(s&&s.cells&&s.cells.length===W*H){S=s;S.debt=S.debt||0;return true}}catch(e){}return false}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function toast(t){var e=$("toast");e.textContent=t;e.style.display="block";clearTimeout(toast.h);toast.h=setTimeout(function(){e.style.display="none"},4500)}

function at(x,y){return(x>=0&&y>=0&&x<W&&y<H)?S.cells[y*W+x]:null}
function near(x,y,r,t){for(var dx=-r;dx<=r;dx++)for(var dy=-r;dy<=r;dy++){if(Math.abs(dx)+Math.abs(dy)>r)continue;var c=at(x+dx,y+dy);if(c&&(c.t===t||(t==="road"&&c.t==="highway")))return true}return false}

function emptyN(){var n={};for(var k in TY)if(!ZONE[k]&&TY[k].c)n[k]=0;return n}
function stats(){
 var n=emptyN(),lv={R:0,C:0,I:0};
 for(var i=0;i<W*H;i++){var c=S.cells[i];if(!c)continue;
  if(ZONE[c.t]){if(c.l>0&&near(i%W,(i/W)|0,2,"road"))lv[c.t]+=c.l}else n[c.t]++}
 return{n:n,lv:lv,supply:n.power*25+n.solar*10+n.wind*15,use:lv.R+lv.C+lv.I};
}
function demand(t,s){
 var j=s.lv.C*6+s.lv.I*8,p=S.pop;
 if(t==="R")return clamp((j+12-p)/(j+12));
 if(t==="C"){var w=p/6;return clamp((w-s.lv.C)/(w+2))}
 var v=p/8+1;return clamp((v-s.lv.I)/(v+2));
}
function calc(){
 cur=stats();
 dm={R:demand("R",cur),C:demand("C",cur),I:demand("I",cur)};
 var base=S.pop*1.2+cur.lv.C*9+cur.lv.I*12;
 tax=base*S.rate/9;
 tax*=1+Math.min(.24,cur.n.bank*.08);
 var A=0,B=0;for(var q in cur.n){A+=cur.n[q]*(AT[q]||0);B+=cur.n[q]*(BD[q]||0)}
 tour=Math.round(Math.min(A,B)*((cur.n.airport||cur.n.train||cur.n.port)?1:.5));
 tax+=tour*4+cur.n.university*40+cur.n.port*(100+cur.lv.I*8)+cur.n.mall*(60+S.pop*.04)+cur.n.office*90+cur.n.farm*35;
 exp=S.debt*.01;for(var k in cur.n)exp+=cur.n[k]*TY[k].u;if(cur.n.cityhall)exp*=.92;
 var short=cur.use>cur.supply;
 var hp=65-(S.rate-9)*3-cur.lv.I*.8-(short?20:0)-(S.money<0?15:0);
 for(var q2 in HP){var v=(cur.n[q2]||0)*HP[q2][0];hp+=HP[q2][0]>0?Math.min(HP[q2][1],v):Math.max(HP[q2][1],v)}
 S.happy=clamp(hp,0,100);
}

function events(){
 if(Math.random()>.07)return;
 var r=Math.random(),z=[];
 for(var i=0;i<W*H;i++){var c=S.cells[i];if(c&&ZONE[c.t]&&c.l>0)z.push(i)}
 if(r<.5&&z.length){var i2=z[(Math.random()*z.length)|0],c2=S.cells[i2];
  if(near(i2%W,(i2/W)|0,5,"svc"))toast("🚒 اندلع حريق، لكن مركز الخدمات أخمده بسرعة.");
  else{c2.l=0;build(i2);toast("🔥 حريق دمّر مبنى! ابني مراكز خدمات قريبة.")}}
 else if(r<.65&&cur.n.police*150<S.pop){var l2=Math.round(150+S.pop*.5);S.money-=l2;toast("🚨 جريمة سرقة: -"+fmt(l2)+". ابني مراكز شرطة.")}
 else if(r<.8){S.money+=1000;toast("🎁 منحة حكومية: +١٬٠٠٠")}
 else if(cur.n.park>=2){var b=300+S.pop;S.money+=b;toast("🎉 مهرجان في الحدائق جذب سياح: +"+fmt(b))}
}
function monthTick(){
 calc();
 var s=cur;
 for(var i=0;i<W*H;i++){var c=S.cells[i];if(!c||!ZONE[c.t]||c.l>=3)continue;
  if(s.use+1>s.supply)break;
  if(!near(i%W,(i/W)|0,2,"road"))continue;
  if(c.t==="R"&&c.l===2&&!near(i%W,(i/W)|0,5,"school"))continue;
  var d=demand(c.t,s);
  if(d>.05&&Math.random()<.2+.4*d){c.l++;s.lv[c.t]++;s.use++;build(i)}}
 calc();
 var cap=cur.lv.R*8;
 if(S.happy>=35){if(S.pop<cap)S.pop+=Math.max(1,Math.ceil((cap-S.pop)*.25));}
 else S.pop-=Math.ceil(S.pop*.06);
 if(S.pop>cap)S.pop=cap;
 events();S.money+=tax-exp;S.month++;
 if(cur.use>cur.supply)toast("الكهرباء مش كفاية. ابني محطة كهرباء.");
 else if(S.money<0)toast("الرصيد بالسالب! ارفع الضريبة أو قلل المصروفات.");
 else if(S.happy<35)toast("السكان غضبانين وبيسيبوا المدينة. ابني حدائق وخدمات أو خفّض الضريبة.");
 var M=[100,500,1000,2500,5000];
 if(S.ms<M.length&&S.pop>=M[S.ms]){toast("مبروك! وصلت "+fmt(M[S.ms])+" ساكن.");S.ms++}
 hud();save();
}

function hud(){
 calc();syncCars();
 $("hM").textContent=fmt(S.money);$("hM").className=S.money<0?"neg":"";
 var r=S.pop<50?"قرية":S.pop<300?"بلدة":S.pop<1000?"مدينة":S.pop<3000?"مدينة كبيرة":"عاصمة";
 $("hRank").textContent=r;$("hP").textContent=fmt(S.pop);
 $("hH").textContent=fmt(S.happy)+"%";
 var net=tax-exp,e=$("hN");e.textContent=(net>=0?"+":"")+fmt(net);e.className=net>=0?"pos":"neg";
 $("hD").textContent=MON[S.month%12]+" "+(2026+((S.month/12)|0)).toLocaleString("ar-EG",{useGrouping:false});
 $("rate").textContent=S.rate+"٪";$("rng").value=S.rate;
 $("bI").textContent="+"+fmt(tax);$("bE").textContent="-"+fmt(exp);
 $("bP").textContent=fmt(cur.use)+" / "+fmt(cur.supply);
 $("bD").textContent=fmt(S.debt);$("bL").textContent=S.own.filter(Boolean).length+" / "+NP*NP+" قطعة";
 $("bT").textContent=fmt(tour);
 $("hB").textContent=fmt(S.cells.filter(Boolean).length);
 var eb=document.querySelector('[data-k="expand"] small');if(eb)eb.textContent=fmt(plotCost());
 ["R","C","I"].forEach(function(k){var v=dm[k],b=$("d"+k);
  b.style.background=v>=0?"var(--ok)":"var(--bad)";b.style.width=Math.abs(v)*50+"%";b.style.left=v>=0?"50%":(50-Math.abs(v)*50)+"%"});
}

/* ---------- 3D ---------- */
var scene=new THREE.Scene();scene.background=new THREE.Color(0x9fd3f0);scene.fog=new THREE.Fog(0x9fd3f0,70,160);
var cam=new THREE.PerspectiveCamera(45,1,.1,200);
var ren=new THREE.WebGLRenderer({antialias:true});ren.setPixelRatio(Math.min(devicePixelRatio,2));
ren.shadowMap.enabled=true;document.body.insertBefore(ren.domElement,document.body.firstChild);
var amb=new THREE.AmbientLight(0xffffff,.65);scene.add(amb);var dayC=new THREE.Color(0x9fd3f0),nightC=new THREE.Color(0x0b1530);
var sun=new THREE.DirectionalLight(0xffffff,.8);sun.position.set(22,38,16);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);var sc=sun.shadow.camera;sc.left=-32;sc.right=32;sc.top=32;sc.bottom=-32;sc.near=1;sc.far=130;scene.add(sun);
var sea=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshLambertMaterial({color:0x7fbfe0}));sea.rotation.x=-Math.PI/2;sea.position.y=-.1;scene.add(sea);
var ground=new THREE.Mesh(new THREE.BoxGeometry(W+1,.2,H+1),new THREE.MeshLambertMaterial({color:0xb9d9a0}));ground.position.y=-.1;ground.receiveShadow=true;scene.add(ground);
var plane=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshBasicMaterial({visible:false}));plane.rotation.x=-Math.PI/2;scene.add(plane);
var grid=new THREE.GridHelper(W,W,0x9dc088,0x9dc088);grid.position.y=.005;scene.add(grid);
var ghost=new THREE.Mesh(new THREE.BoxGeometry(1,.25,1),new THREE.MeshBasicMaterial({color:0x2ecc71,transparent:true,opacity:.55}));ghost.position.y=.13;ghost.visible=false;scene.add(ghost);
var th=.8,ph=.95,rad=48;
function camUpdate(){cam.position.set(rad*Math.cos(ph)*Math.sin(th),rad*Math.sin(ph),rad*Math.cos(ph)*Math.cos(th));cam.lookAt(0,0,0)}
function resize(){ren.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}
addEventListener("resize",resize);

var mats={};function M(c){return mats[c]||(mats[c]=new THREE.MeshLambertMaterial({color:c}))}
function box(w,h,d,c,x,y,z){var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c));m.position.set(x||0,(y||0)+h/2,z||0);m.castShadow=m.receiveShadow=true;return m}
function cyl(rt,rb,h,c,x,y,z){var m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,20),M(c));m.position.set(x||0,(y||0)+h/2,z||0);m.castShadow=m.receiveShadow=true;return m}
function cone(r,h,c,x,y,z,seg){var m=new THREE.Mesh(new THREE.CylinderGeometry(0,r,h,seg||4),M(c));m.position.set(x||0,(y||0)+h/2,z||0);if(!seg)m.rotation.y=Math.PI/4;m.castShadow=true;return m}
var C_="c",MESH={
 parking:[[.04,.02,.5,0xffffff,-.25,.05,0],[.04,.02,.5,0xffffff,0,.05,0],[.04,.02,.5,0xffffff,.25,.05,0],[.2,.1,.35,0xe74c3c,-.12,.05,.1],[.2,.1,.35,0x3498db,.13,.05,-.1]],
 mall:[[.9,.35,.8,0xc9d6ff,0,.04,0],[.5,.2,.5,0xff8fa3,0,.39,0],[.4,.05,.1,0xffffff,0,.22,.42]],
 office:[[.5,1.2,.5,0x9fb4c9,-.12,.04,0],[.4,.8,.4,0xb7c9dc,.25,.04,.2],[.3,.1,.3,0x2e86de,-.12,1.24,0]],
 farm:[[.8,.03,.18,0xb59c4a,0,.05,-.28],[.8,.03,.18,0x6fae4a,0,.05,0],[.8,.03,.18,0xb59c4a,0,.05,.28],[.3,.25,.3,0xc0392b,.3,.04,-.3]],
 wind:[[C_,.04,.07,.9,0xf2f5f8,0,.04,0],[.1,.1,.1,0xdfe9f2,0,.95,0],[.05,.6,.02,0xffffff,0,.7,.07],[.6,.05,.02,0xffffff,0,.975,.07]],
 water:[[C_,.2,.12,.5,0x9fb6c9,0,.04,0],[C_,.3,.3,.3,0xcfe8ff,0,.54,0],[C_,0,.3,.15,0x5d7b99,0,.84,0]],
 university:[[.9,.35,.5,0xe8d9c0,0,.04,.1],[.5,.5,.3,0xe8d9c0,0,.04,-.25],[.8,.05,.08,0xffffff,0,.39,.36],[C_,0,.2,.2,0x2e86de,0,.54,-.25]],
 library:[[.7,.35,.6,0xe8d9c0,0,.04,0],[.76,.05,.66,0xa05a2c,0,.39,0],[.4,.04,.12,0x2e86de,0,.2,.32]],
 fountain:[[C_,.34,.34,.1,0xc9d6dd,0,.04,0],[C_,.28,.28,.05,0x6ec6e8,0,.12,0],[C_,.04,.04,.35,0xc9d6dd,0,.1,0],[C_,.1,.04,.08,0xbfe9f7,0,.45,0]],
 cinema:[[.8,.5,.7,0x6b4d8a,0,.04,0],[.84,.06,.74,0xe74c3c,0,.54,0],[.5,.1,.04,0xffc83d,0,.3,.37]],
 museum:[[.8,.35,.6,0xe6dcc8,0,.04,0],[.9,.1,.7,0xd9ceb4,0,.39,0],[.06,.3,.06,0xffffff,-.25,.08,.34],[.06,.3,.06,0xffffff,0,.08,.34],[.06,.3,.06,0xffffff,.25,.08,.34]],
 amusement:[[.04,.7,.04,0xff8fa3,0,.1,0],[.7,.04,.04,0xff8fa3,0,.43,0],[.1,.1,.1,0xffc83d,0,.8,0],[.1,.1,.1,0x3498db,0,.05,0],[.1,.1,.1,0x2ecc71,.35,.4,0],[.1,.1,.1,0xe74c3c,-.35,.4,0],[C_,.22,.26,.14,0xffc83d,-.28,.04,.3],[C_,0,.26,.12,0xe74c3c,-.28,.18,.3]],
 bus:[[.7,.18,.34,0xf2b134,0,.04,0],[.5,.06,.36,0x5dade2,0,.14,0],[.03,.45,.03,0x555555,.35,.04,-.3],[.18,.1,.02,0x2e86de,.35,.4,-.3]],
 metro:[[.7,.3,.7,0x4a90d9,0,.04,0],[.76,.05,.76,0xffffff,0,.34,0],[.2,.2,.04,0xe74c3c,0,.42,.37]],
 train:[[.9,.28,.5,0x7b8794,0,.04,.2],[.96,.05,.56,0xd9534f,0,.32,.2],[.96,.02,.06,0x555d6b,0,.045,-.38],[.12,.5,.12,0xcfd5de,.38,.04,.2]],
 port:[[.06,.8,.06,0xf2994a,-.3,.04,0],[.7,.05,.05,0xf2994a,0,.82,0],[.28,.14,.14,0xe74c3c,.2,.04,.25],[.28,.14,.14,0x3498db,.2,.18,.25],[.28,.14,.14,0xf1c40f,-.15,.04,.3]],
 hotel:[[.6,.9,.55,0xf0e3d0,0,.04,0],[.62,.06,.57,0xc0392b,0,.94,0],[.5,.05,.02,0xbfd8ff,0,.3,.28],[.5,.05,.02,0xbfd8ff,0,.55,.28],[.5,.05,.02,0xbfd8ff,0,.8,.28]],
 resort:[[.5,.03,.3,0x5dade2,-.1,.05,.25],[.5,.28,.4,0xf5e9d3,.1,.04,-.2],[.56,.05,.46,0xd8573c,.1,.32,-.2],[.05,.35,.05,0x7a5230,-.35,.04,-.3],[C_,0,.18,.15,0x2e8b46,-.35,.39,-.3]],
 bank:[[.7,.45,.6,0xd9e4d0,0,.04,0],[.78,.06,.68,0x8a9a78,0,.49,0],[.06,.35,.06,0xffffff,-.25,.06,.33],[.06,.35,.06,0xffffff,0,.06,.33],[.06,.35,.06,0xffffff,.25,.06,.33]],
 cityhall:[[.8,.4,.6,0xe9e0d0,0,.04,0],[C_,.16,.16,.35,0xe9e0d0,0,.44,0],[C_,0,.2,.2,0x2e86de,0,.79,0],[.8,.05,.1,0xffffff,0,.3,.32]]
};
var groups={};
function build(i){
 if(groups[i]){scene.remove(groups[i]);delete groups[i]}
 var c=S.cells[i];if(!c)return;
 var g=new THREE.Group();g.position.set((i%W)-W/2+.5,0,((i/W)|0)-H/2+.5);
 var t=c.t,l=c.l;
 if(t==="road"||t==="highway"){var hw=t==="highway";g.add(box(1,.05,1,hw?0x2b323d:0x39424f));g.add(box(hw?.14:.08,.01,.3,hw?0xffc83d:0xe8e8e8,0,.05,0))}
 else{g.add(box(.96,.04,.96,MESH[t]?(t==="farm"?0x9bbf6a:t==="port"?0x5f7d95:0xc9ccd1):TY[t].col));
  if(t==="R"&&l>0){var h=.25+.22*l;g.add(box(.62,h,.62,0xf3e5c8,0,.04,0));g.add(cone(.5,.28,0xd8573c,0,.04+h,0))}
  else if(t==="C"&&l>0){var h2=.3+.4*l;g.add(box(.72,h2,.72,0x3b82d6,0,.04,0));g.add(box(.78,.05,.78,0xbfd8ff,0,.04+h2,0))}
  else if(t==="I"&&l>0){g.add(box(.84,.28+.12*l,.84,0x8a93a3,0,.04,0));for(var k=0;k<l;k++)g.add(box(.12,.55,.12,0x555d6b,-.28+k*.28,.3,-.25))}
  else if(t==="power"){g.add(box(.8,.45,.8,0xf5c542,0,.04,0));var ct=new THREE.Mesh(new THREE.CylinderGeometry(.16,.26,.9,12),M(0xcfd5de));ct.position.set(.15,.5,.1);ct.castShadow=true;g.add(ct)}
  else if(t==="park"){[[-.25,-.2],[.25,-.1],[0,.25]].forEach(function(p){g.add(box(.06,.2,.06,0x7a5230,p[0],.04,p[1]));g.add(cone(.2,.4,0x2e8b46,p[0],.24,p[1],8))})}
  else if(t==="school"){g.add(box(.74,.38,.74,0xf2e2b0,0,.04,0));g.add(box(.82,.06,.82,0xc0392b,0,.42,0));g.add(box(.03,.4,.03,0x555555,.3,.48,.3));g.add(box(.2,.12,.02,0x2e86de,.4,.76,.3))}
  else if(MESH[t]){MESH[t].forEach(function(p){g.add(p.length===8?cyl(p[1],p[2],p[3],p[4],p[5],p[6],p[7]):box(p[0],p[1],p[2],p[3],p[4],p[5],p[6]))})}
  else if(t==="solar"){[-.22,.22].forEach(function(z){var pn=box(.8,.04,.38,0x2c5aa0,0,.2,z);pn.rotation.x=-.45;g.add(pn);g.add(box(.05,.2,.05,0xcfd5de,.3,.04,z))})}
  else if(t==="tree"){g.add(box(.1,.3,.1,0x7a5230,0,.04,0));g.add(cone(.3,.5,0x2e8b46,0,.3,0,8));g.add(cone(.22,.4,0x3aa35b,0,.62,0,8))}
  else if(t==="police"){g.add(box(.7,.4,.7,0x3b5bdb,0,.04,0));g.add(box(.78,.05,.78,0xffffff,0,.44,0));g.add(box(.14,.08,.1,0xe74c3c,-.1,.49,0));g.add(box(.14,.08,.1,0x3498db,.1,.49,0))}
  else if(t==="hospital"){g.add(box(.84,.55,.7,0xf5f5f5,0,.04,0));g.add(box(.3,.9,.3,0xe3eaf2,.3,.04,-.25));g.add(box(.4,.04,.12,0xd33a3a,-.1,.6,.1));g.add(box(.12,.04,.4,0xd33a3a,-.1,.6,.1))}
  else if(t==="stadium"){g.add(cyl(.48,.4,.35,0x9aa5b1,0,.04,0));g.add(cyl(.32,.32,.04,0x3f9b4a,0,.37,0));[[-.4,-.4],[.4,-.4],[-.4,.4],[.4,.4]].forEach(function(p){g.add(box(.04,.55,.04,0x555d6b,p[0],.04,p[1]))})}
  else if(t==="airport"){g.add(box(.96,.02,.3,0x333a44,0,.04,.2));g.add(box(.5,.25,.22,0xdfe6ee,0,.04,-.3));g.add(box(.08,.5,.08,0xcfd5de,.36,.04,-.3));g.add(box(.18,.1,.18,0x5dade2,.36,.54,-.3));g.add(box(.5,.06,.1,0xffffff,-.1,.1,.2));g.add(box(.08,.04,.42,0xffffff,-.05,.1,.2))}
  else if(t==="svc"){g.add(box(.7,.4,.7,0xffffff,0,.04,0));g.add(box(.4,.05,.12,0xd33a3a,0,.44,0));g.add(box(.12,.05,.4,0xd33a3a,0,.44,0))}
 }
 groups[i]=g;scene.add(g);
}

var locks=[],lockMat=new THREE.MeshBasicMaterial({color:0x101b2d,transparent:true,opacity:.55});
function plotOf(x,y){return((y/PL)|0)*NP+((x/PL)|0)}
function plotCost(){return Math.round(4000*Math.pow(1.4,S.ex)/100)*100}
function adjOwned(pi){var px=pi%NP,py=(pi/NP)|0;return[[1,0],[-1,0],[0,1],[0,-1]].some(function(d){var a=px+d[0],b=py+d[1];return a>=0&&b>=0&&a<NP&&b<NP&&S.own[b*NP+a]})}
function syncLocks(){
 for(var pi=0;pi<NP*NP;pi++){
  if(S.own[pi]){if(locks[pi]){scene.remove(locks[pi]);locks[pi]=null}}
  else if(!locks[pi]){var m=new THREE.Mesh(new THREE.BoxGeometry(PL-.2,.5,PL-.2),lockMat);
   m.position.set((pi%NP)*PL+PL/2-W/2,.25,((pi/NP)|0)*PL+PL/2-H/2);scene.add(m);locks[pi]=m}
 }
}
function buyPlot(pi){
 if(S.own[pi])return;
 if(!adjOwned(pi)){toast("لازم تشتري الأرض المجاورة لمدينتك الأول.");snd(150,.2);return}
 var c=plotCost();
 if(S.money<c){toast("محتاج "+fmt(c)+" لشراء الأرض دي.");snd(150,.2);return}
 S.money-=c;S.own[pi]=1;S.ex++;syncLocks();hud();save();snd(880,.25);
 toast("🗺️ كبرت مدينتك! سعر القطعة الجاية: "+fmt(plotCost()));
}
var cars=[],cmat=[0xe74c3c,0xf1c40f,0x3498db,0xecf0f1,0x9b59b6];
function wp(x,y){return[x-W/2+.5,y-H/2+.5]}
function isRoad(x,y){var c=at(x,y);return !!c&&(c.t==="road"||c.t==="highway")}
function syncCars(){
 var roads=[];for(var i=0;i<W*H;i++){var c=S.cells[i];if(c&&(c.t==="road"||c.t==="highway"))roads.push(i)}
 var want=roads.length?Math.min(30,1+Math.floor(S.pop/8)):0;
 cars=cars.filter(function(o){if(isRoad(o.x,o.y)&&isRoad(o.nx,o.ny))return true;scene.remove(o.m);return false});
 while(cars.length>want){scene.remove(cars.pop().m)}
 while(cars.length<want){var r=roads[(Math.random()*roads.length)|0],x=r%W,y=(r/W)|0;
  var m=box(.22,.1,.38,cmat[(Math.random()*cmat.length)|0],0,0,0);scene.add(m);
  cars.push({m:m,x:x,y:y,nx:x,ny:y,t:1,dx:1,dy:0})}
}
function stepCar(o){
 o.x=o.nx;o.y=o.ny;
 var opts=[[1,0],[-1,0],[0,1],[0,-1]].filter(function(d){return isRoad(o.x+d[0],o.y+d[1])});
 if(!opts.length){o.t=0;return}
 var fwd=opts.filter(function(d){return d[0]===o.dx&&d[1]===o.dy}),back=opts.filter(function(d){return d[0]===-o.dx&&d[1]===-o.dy});
 var p=(fwd.length&&Math.random()<.7)?fwd:(opts.length>1?opts.filter(function(d){return !back.length||d!==back[0]}):opts);
 var d=p[(Math.random()*p.length)|0];o.dx=d[0];o.dy=d[1];o.nx=o.x+d[0];o.ny=o.y+d[1];o.t=0;
}
function updateCars(dt){
 cars.forEach(function(o){
  o.t+=dt*.0022;if(o.t>=1)stepCar(o);
  var a=wp(o.x,o.y),b=wp(o.nx,o.ny),t=Math.min(1,o.t);
  o.m.position.set(a[0]+(b[0]-a[0])*t,.1,a[1]+(b[1]-a[1])*t);
  o.m.rotation.y=(o.dx!==0)?Math.PI/2:0;
 });
}

/* ---------- input ---------- */
var rc=new THREE.Raycaster(),v2=new THREE.Vector2(),down=false,drag=null,hv=-1;
function pick(e){var r=ren.domElement.getBoundingClientRect();v2.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);rc.setFromCamera(v2,cam);
 var h=rc.intersectObject(plane)[0];if(!h)return -1;var x=Math.floor(h.point.x+W/2),y=Math.floor(h.point.z+H/2);
 return(x<0||y<0||x>=W||y>=H)?-1:y*W+x}
function place(i){
 if(i<0||tool==="cam")return;
 var pi=plotOf(i%W,(i/W)|0);
 if(tool==="expand"){buyPlot(pi);return}
 if(!S.own[pi]){toast("الأرض دي مش ملكك. اشتريها بأداة 🗺️ توسعة.");return}
 var c=S.cells[i];
 if(tool==="bull"){if(c){S.money+=Math.floor(TY[c.t].c/2);S.cells[i]=null;build(i);hud();save();snd(300)}return}
 if(c)return;
 if(S.money<TY[tool].c){toast("الرصيد مش كفاية لبناء "+TY[tool].n+".");snd(150,.2);return}
 S.money-=TY[tool].c;S.cells[i]={t:tool,l:0};build(i);hud();save();snd(520);
}
function ghostAt(i){
 if(i<0||tool==="cam"){ghost.visible=false;return}
 var x=i%W,y=(i/W)|0,pi=plotOf(x,y);
 ghost.visible=true;
 if(tool==="expand"){ghost.scale.set(PL,1,PL);ghost.position.set((pi%NP)*PL+PL/2-W/2,.2,((pi/NP)|0)*PL+PL/2-H/2);
  ghost.material.color.set(!S.own[pi]&&adjOwned(pi)&&S.money>=plotCost()?0x2ecc71:0xe74c3c);return}
 ghost.scale.set(1,1,1);ghost.position.set(x-W/2+.5,.13,y-H/2+.5);
 var ok=!S.own[pi]?false:(tool==="bull"?!!S.cells[i]:(!S.cells[i]&&S.money>=TY[tool].c));
 ghost.material.color.set(tool==="bull"?(ok?0xff9f1c:0xe74c3c):(ok?0x2ecc71:0xe74c3c));
}
function info(i){
 var e=$("info"),c=i<0?null:S.cells[i];
 if(i>=0&&tool==="expand"){var pp=plotOf(i%W,(i/W)|0);e.textContent=S.own[pp]?"أرضك":(adjOwned(pp)?"🗺️ قطعة أرض للبيع: "+fmt(plotCost()):"لازم تشتري الأرض المجاورة الأول");e.style.display="block";return}
 if(i>=0&&!S.own[plotOf(i%W,(i/W)|0)]){e.textContent="أرض مش ملكك. اشتريها بأداة 🗺️ توسعة.";e.style.display="block";return}
 if(!c){e.style.display="none";return}
 var x=i%W,y=(i/W)|0,s=[TY[c.t].n];if(DESC[c.t]&&!ZONE[c.t])s.push(DESC[c.t]);
 if(ZONE[c.t]){s.push(c.l?"مستوى "+c.l:"لسه فاضية");
  if(!near(x,y,2,"road"))s.push("⚠ مفيش طريق قريب");
  else if(cur.use>=cur.supply)s.push("⚠ الكهرباء ناقصة");
  else if(dm[c.t]<=.05)s.push("الطلب منخفض");
  if(c.t==="R"&&c.l===2&&!near(x,y,5,"school"))s.push("محتاج مدرسة قريبة للمستوى ٣")}
 e.textContent=s.join(" · ");e.style.display="block";
}
var cv=ren.domElement;
cv.addEventListener("contextmenu",function(e){e.preventDefault()});
var pts={},pd=0;
function pdist(){var k=Object.keys(pts),a=pts[k[0]],b=pts[k[1]];return Math.hypot(a.x-b.x,a.y-b.y)}
cv.addEventListener("pointerdown",function(e){
 try{cv.setPointerCapture(e.pointerId)}catch(_){}
 pts[e.pointerId]={x:e.clientX,y:e.clientY};
 if(Object.keys(pts).length===2){pd=pdist();down=false;drag=null;return}
 if(tool==="cam"||e.button===2){drag={x:e.clientX,y:e.clientY}}else{down=true;place(pick(e))}
});
cv.addEventListener("pointermove",function(e){
 if(pts[e.pointerId])pts[e.pointerId]={x:e.clientX,y:e.clientY};
 if(Object.keys(pts).length===2){var d=pdist();if(pd)zoom(pd/d);pd=d;return}
 if(drag){th-=(e.clientX-drag.x)*.008;ph=clamp(ph+(e.clientY-drag.y)*.006,.35,1.45);drag={x:e.clientX,y:e.clientY};camUpdate();return}
 hv=pick(e);ghostAt(hv);info(hv);if(down&&tool!=="expand")place(hv);
});
function pend(e){delete pts[e.pointerId];down=false;drag=null;pd=0}
cv.addEventListener("pointerup",pend);cv.addEventListener("pointercancel",pend);
cv.addEventListener("pointerleave",function(){ghost.visible=false;info(-1)});
cv.addEventListener("wheel",function(e){e.preventDefault();rad=clamp(rad*(1+e.deltaY*.001),14,85);camUpdate()},{passive:false});
function zoom(f){rad=clamp(rad*f,14,85);camUpdate()}
$("rl").onclick=function(){th-=.5;camUpdate()};$("rr").onclick=function(){th+=.5;camUpdate()};
$("zi").onclick=function(){zoom(.85)};$("zo").onclick=function(){zoom(1.18)};
$("bBud").onclick=function(){var o=$("bud").classList.toggle("on");this.setAttribute("aria-pressed",o)};
$("mu").onclick=function(){muted=!muted;this.textContent=muted?"🔇":"🔊"};
$("loan").onclick=function(){S.debt+=5000;S.money+=5000;hud();save()};
$("repay").onclick=function(){var a=Math.min(5000,S.debt,Math.max(0,S.money));S.debt-=a;S.money-=a;hud();save()};
$("rng").oninput=function(){S.rate=+this.value;hud()};

/* ---------- toolbar ---------- */
var CATS=[
 {k:"tools",i:"🖐️",n:"أدوات",t:["cam","bull","expand"]},
 {k:"roads",i:"🛣️",n:"طرق",t:["road","highway","parking"]},
 {k:"build",i:"🏘️",n:"مباني",t:["R","C","I","mall","office","farm"]},
 {k:"util",i:"⚡",n:"مرافق",t:["power","solar","wind","water"]},
 {k:"serv",i:"🛡️",n:"خدمات",t:["svc","police","hospital"]},
 {k:"edu",i:"🎓",n:"تعليم",t:["school","university","library"]},
 {k:"fun",i:"🎡",n:"ترفيه",t:["park","tree","fountain","cinema","museum","amusement","stadium"]},
 {k:"trans",i:"🚇",n:"مواصلات",t:["bus","metro","train"]},
 {k:"travel",i:"✈️",n:"سفر ورحلات",t:["airport","port","hotel","resort"]},
 {k:"eco",i:"🏦",n:"اقتصاد",t:["bank","cityhall"]}
];
var cat="roads",bot=$("bot"),cbar=$("cats"),ibar=$("items"),sb=[],rb;
function mk(p,label,sub,fn,pressed,k){var b=document.createElement("button");b.innerHTML=label+"<small>"+sub+"</small>";b.onclick=fn;if(k)b.dataset.k=k;if(pressed!==undefined)b.setAttribute("aria-pressed",pressed);p.appendChild(b);return b}
function resetGame(){
 if(!confirmReset){confirmReset=true;rb.innerHTML="تأكيد؟<small>اضغط تاني</small>";setTimeout(function(){confirmReset=false;if(rb)rb.innerHTML="🗑️<small>جديد</small>"},3000);return}
 confirmReset=false;rb.innerHTML="🗑️<small>جديد</small>";
 Object.keys(groups).forEach(function(i){scene.remove(groups[i])});groups={};fresh();syncLocks();hud();save();toast("بداية جديدة. ابدأ بطريق.")}
function drawCats(){
 cbar.innerHTML="";
 CATS.forEach(function(c){mk(cbar,c.i+" "+c.n,"",function(){selectTool(c.t[0])},c.k===cat)});
 var sp=document.createElement("div");sp.className="sep";cbar.appendChild(sp);sb=[];
 [["⏸","وقف",0],["▶️","عادي",1],["⏩","سريع",3]].forEach(function(a){var b=mk(cbar,a[0],a[1],function(){speed=a[2];sb.forEach(function(x){x.setAttribute("aria-pressed",x===b)})},a[2]===speed);sb.push(b)});
 rb=mk(cbar,"🗑️","جديد",resetGame);
}
function drawItems(){
 ibar.innerHTML="";
 CATS.filter(function(c){return c.k===cat})[0].t.forEach(function(k){var T=TY[k];mk(ibar,T.i+" "+T.n,T.c?fmt(T.c):"",function(){selectTool(k)},k===tool,k)});
 if(S)hud();
}
function selectTool(k){
 tool=k;ghost.visible=false;
 CATS.forEach(function(c){if(c.t.indexOf(k)>=0&&c.k!==cat){cat=c.k;drawCats();drawItems()}});
 [].forEach.call(ibar.querySelectorAll("[data-k]"),function(o){o.setAttribute("aria-pressed",o.dataset.k===k)});
 $("tdesc").textContent=TY[k].n+(DESC[k]?" · "+DESC[k]:"")+(TY[k].c?" · صيانة "+TY[k].u+" / شهر":"");
}
drawCats();drawItems();selectTool("road");

addEventListener("keydown",function(e){
 if(e.target.tagName==="INPUT")return;
 var k=e.key.toLowerCase(),n=parseInt(k,10);
 if(!isNaN(n)){var cc=CATS[n===0?9:n-1];if(cc)selectTool(cc.t[0])}
 else if(k==="arrowright"||k==="arrowleft"){var L=CATS.filter(function(c){return c.k===cat})[0].t,ix=L.indexOf(tool);selectTool(L[(ix+(k==="arrowright"?1:L.length-1))%L.length])}else if(k==="b"){selectTool("bull")}else if(k==="x"){selectTool("expand")}else if(k==="q"){th-=.4;camUpdate()}else if(k==="e"){th+=.4;camUpdate()}
 else if(k==="+"||k==="="){zoom(.85)}else if(k==="-"){zoom(1.18)}
 else if(k===" "){e.preventDefault();speed=speed?0:1;sb.forEach(function(x,i){x.setAttribute("aria-pressed",[0,1,3][i]===speed)})}
});

var started=false,ld=0,lt=setInterval(function(){ld=Math.min(100,ld+4+Math.random()*8);$("ldb").style.width=ld+"%";if(ld>=100){clearInterval(lt);$("go").disabled=false;$("go").textContent="ابدأ اللعب"}},90);
$("go").onclick=function(){started=true;var s=$("splash");s.classList.add("off");setTimeout(function(){s.style.display="none"},700);snd(660,.2)};

/* ---------- loop ---------- */
fresh();load();for(var i=0;i<W*H;i++)build(i);
syncLocks();resize();camUpdate();hud();
toast("ابدأ: ابني طريق، وحط مناطق سكنية جنبه، وبعدين محطة كهرباء. المباني بتكبر لوحدها.");
var last=performance.now(),acc=0;
(function loop(now){requestAnimationFrame(loop);var dt=Math.min(100,now-last);last=now;
 acc+=started?dt*speed:0;if(acc>=3000){acc=0;monthTick()}
 var k=Math.min(1,Math.max(0,Math.sin(now/20000)*.8+.5));
 scene.background.copy(nightC).lerp(dayC,k);scene.fog.color.copy(scene.background);
 sun.intensity=.2+.65*k;amb.intensity=.3+.4*k;updateCars(dt*Math.min(speed,2));
 ren.render(scene,cam)})(last);
})();

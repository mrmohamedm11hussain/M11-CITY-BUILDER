// مولّد القضايا: كل ملف رقم = جريمة مختلفة (الجاني والأدلة والمكان والمشتبهين)
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const SHOE=[40,42,44,46],PERF=['عود','ورد','مسك','ياسمين'];
const HC={'جرح':'نقط دم على مقبض الباب… اللي ضربه اتجرح في إيده.','حرق':'قطعة قماش عليها أثر حرق طازة… القاتل إيده محروقة.','طلاء':'بصمة صباع بطلاء أزرق على الإزاز… القاتل إيده عليها طلاء.'};
const HV={'جرح':'جرح ملفوف بمنديل في إيده','حرق':'إيده محروقة ومتغطية','طلاء':'أظافره فيها طلاء أزرق'};
const NAMES=[['يوسف الراوي','السكرتير'],['منى الشاذلي','شريكة الضحية'],['هشام البحيري','الجار'],['سلمى عاشور','الممرضة'],['عادل الفخراني','السواق'],['رشا مختار','الصحفية']];
const TELL=['بيعضّ شفايفه','عينه بتتحرك ناحية الباب','صوته بيرتعش','بيبتسم في وقت غلط','بيعدّل ساعته كل شوية'];
const SAY=['كنت نايم وماسمعتش حاجة.','خرجت أشم هوا وقت الحادثة.','ماكنتش أعرفه كويس.','كنت بكلم حد في التليفون.','ماعنديش حاجة أخبيها.'];
const VICT=['د. سامي منصور','الحاج عبد الله الصيرفي','المعلمة نادية فؤاد','الفنان كمال رشدي','ليلى الحكيم'];
const PLACE=['فيلا قديمة في المعادي','مسرح مهجور في وسط البلد','عمارة قديمة في الإسكندرية','بيت على أطراف الفيوم'];
const LN={study:'المكتب',cellar:'القبو',garden:'الحديقة',attic:'العلّية',kitchen:'المطبخ',corridor:'الممر'};
function build(seed,pl){const r=rng(seed),pick=a=>a[Math.floor(r()*a.length)],shuf=a=>a.map(x=>[r(),x]).sort((p,q)=>p[0]-q[0]).map(x=>x[1]);
 const keys=['shoe','perf','hand'],pools={shoe:SHOE,perf:PERF,hand:Object.keys(HC)},ky={shoe:pick(SHOE),perf:pick(PERF),hand:pick(Object.keys(HC))};
 const k=Math.floor(r()*4),nm=shuf(NAMES).slice(0,4);
 const sus=nm.map((n,i)=>{const s={n:n[0],job:n[1],seed:Math.floor(r()*99999),tell:pick(TELL),say:pick(SAY)};
  if(i===k)keys.forEach(a=>s[a]=ky[a]);
  else{const sh=shuf(keys).slice(0,pl>=2?2:1);keys.forEach(a=>s[a]=sh.includes(a)?ky[a]:pick(pools[a].filter(v=>v!==ky[a])))}return s});
 const w=pick(['سكينة مطبخ قديمة','شمعدان نحاس','حبل تقيل','كوباية مسمومة']),m=pick(['دَين','ميراث','سر','غيرة']),time=pick(['٣:١٧','٢:٤٠','٤:٠٥','١:٥٥']);
 const cl=shuf([{t:`بصمة حذاء مقاس ${ky.shoe} في الطين.`,key:1},{t:`ريحة ${ky.perf} لسه عالقة في المكان.`,key:1},{t:HC[ky.hand],key:1},{t:`السلاح كان: ${w}.`},{t:`ورقة نصها محروق، باقي منها كلمة: «${m}».`},{t:`ساعة الحيطة واقفة على ${time}.`}]);
 const locs=shuf(Object.keys(LN)).slice(0,3).map((x,i)=>({k:x,name:LN[x],i:0,clues:cl.slice(i*2,i*2+2)}));
 return{seed,victim:pick(VICT),place:pick(PLACE),time,w,m,sus,k,locs,b:11,max:11}}
// «الصدى»: المخرج الخفي. بيراقب سرعة اللاعب وبيضبط الرعب والتلميحات.
const Echo={last:Date.now(),gaps:[],t:0,h:0,
tick(){const n=Date.now();this.gaps.push(Math.min((n-this.last)/1000,60));this.last=n},
avg(){const g=this.gaps.slice(1);return g.length?g.reduce((a,b)=>a+b,0)/g.length:5},
prof(){if(this.gaps.length<3)return'curious';const a=this.avg();return a>7?'hesitant':a<3?'reckless':'curious'},
pulse(){this.t++;const p=this.prof();if(this.t<(p==='reckless'?2:3)||Math.random()<.2)return;this.t=0;
 if(p==='hesitant'&&this.h<2&&hint()){this.h++;return}
 const k=Math.floor(Math.random()*4);
 if(k===0){flicker();Snd.thump()}else if(k===1){Snd.creak();whisper('…سمعت خطوات فوق راسك.')}else{k===2?Snd.beat():Snd.hiss();whisper(this.line(p))}},
line(p){const n=P.name;return{hesitant:`${n}… ليه بتتردد؟ الوقت بيخلص.`,reckless:`براحة يا ${n}. السرعة بتخلّيك تفوّت حاجات.`,curious:`بتدوّر على إيه يا ${n}؟ أنا عارف.`}[p]},
rep(){const p=this.prof();return`الصدى سجّل: متوسط تفكيرك ${this.avg().toFixed(1)} ثانية بين كل خطوة — ${{hesitant:'شخصية متردّدة، فأعطاك تلميحات',reckless:'شخصية متهوّرة، فزوّد عليك الرعب',curious:'شخصية فضولية'}[p]}.`}};

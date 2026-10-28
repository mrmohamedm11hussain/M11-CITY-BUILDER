const Snd={c:null,nb:null,
init(){if(this.c)return;try{const c=this.c=new(window.AudioContext||webkitAudioContext)();
 const nb=this.nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 [48,72.5].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type=i?'sine':'sawtooth';o.frequency.value=f;g.gain.value=i?.02:.022;o.connect(g);g.connect(c.destination);o.start()});
 const s=c.createBufferSource(),bp=c.createBiquadFilter(),g=c.createGain(),l=c.createOscillator(),lg=c.createGain();
 s.buffer=nb;s.loop=true;bp.type='bandpass';bp.frequency.value=380;g.gain.value=.03;s.connect(bp);bp.connect(g);g.connect(c.destination);s.start();
 l.frequency.value=.1;lg.gain.value=250;l.connect(lg);lg.connect(bp.frequency);l.start()}catch(e){}},
tone(f,d,v,ty,f2){if(!this.c)return;const c=this.c,t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type=ty||'sine';o.frequency.setValueAtTime(f,t);
 if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(c.destination);o.start();o.stop(t+d)},
thump(v){this.tone(90,.5,.4*(v||1),'sine',30)},
beat(){this.thump(.8);setTimeout(()=>this.thump(.5),190)},
ding(){this.tone(880,.7,.08);this.tone(1318,.9,.05)},
creak(){this.tone(110,.9,.06,'sawtooth',200)},
hiss(){if(!this.c)return;const c=this.c,t=c.currentTime,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
 s.buffer=this.nb;f.type='highpass';f.frequency.value=3000;g.gain.setValueAtTime(.07,t);g.gain.exponentialRampToValueAtTime(.001,t+1);s.connect(f);f.connect(g);g.connect(c.destination);s.start();s.stop(t+1)}};

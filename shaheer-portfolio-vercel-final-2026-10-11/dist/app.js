const revealItems=[...document.querySelectorAll(".reveal")];
const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer=window.matchMedia("(any-pointer: fine)").matches;
const hoverPointer=window.matchMedia("(any-hover: hover)").matches;
const coarsePointer=window.matchMedia("(any-pointer: coarse)").matches;
const mobileViewport=window.matchMedia("(max-width: 680px)").matches;

if(reducedMotion||!("IntersectionObserver" in window)){
  revealItems.forEach(item=>item.classList.add("in-view"));
}else{
  const revealObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    });
  },{threshold:.12,rootMargin:"0px 0px -6% 0px"});
  revealItems.forEach(item=>revealObserver.observe(item));
}

const railLinks=[...document.querySelectorAll(".rail-link")];
const sections=[...document.querySelectorAll(".section[id]")];
let navigationFrame=null;
function updateActiveSection(){
  const marker=window.innerHeight*.38;
  let current=sections[0]?.id;
  sections.forEach(section=>{
    if(section.getBoundingClientRect().top<=marker)current=section.id;
  });
  railLinks.forEach(link=>link.classList.toggle("active",link.dataset.section===current));
  navigationFrame=null;
}
window.addEventListener("scroll",()=>{
  if(navigationFrame)return;
  navigationFrame=requestAnimationFrame(updateActiveSection);
},{passive:true});
window.addEventListener("resize",updateActiveSection);
updateActiveSection();

function updateKarachiTime(){
  const time=new Intl.DateTimeFormat("en-GB",{
    timeZone:"Asia/Karachi",
    hour:"2-digit",
    minute:"2-digit",
    hour12:false
  }).format(new Date());
  document.querySelectorAll("#local-time, #mobile-time").forEach(target=>{
    if(target.textContent===time)return;
    target.textContent=time;
    target.classList.remove("time-tick");
    void target.offsetWidth;
    target.classList.add("time-tick");
  });
}
updateKarachiTime();
const nextMinuteDelay=60000-(Date.now()%60000)+60;
setTimeout(()=>{
  updateKarachiTime();
  setInterval(updateKarachiTime,60000);
},nextMinuteDelay);
document.querySelector("#year").textContent=new Date().getFullYear();

const playButton=document.querySelector("#play-ambient");
const dock=document.querySelector(".music-dock");
let audioContext=null;
let master=null;
let phraseTimer=null;
let playing=false;
const voices=new Set();
const notes=[146.83,164.81,196,220,246.94,293.66];

function setPlayerState(isPlaying){
  playing=isPlaying;
  playButton.lastChild.textContent=isPlaying?"PAUSE":"PLAY";
  playButton.setAttribute("aria-label",isPlaying?"Pause peaceful ambient music":"Play peaceful ambient music");
  playButton.setAttribute("aria-pressed",String(isPlaying));
  dock.classList.toggle("playing",isPlaying);
}

function makeVoice(frequency,start,duration,volume,type="sine"){
  const oscillator=audioContext.createOscillator();
  const gain=audioContext.createGain();
  oscillator.type=type;
  oscillator.frequency.setValueAtTime(frequency,start);
  oscillator.detune.setValueAtTime((Math.random()-.5)*8,start);
  gain.gain.setValueAtTime(.0001,start);
  gain.gain.exponentialRampToValueAtTime(volume,start+1.2);
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  oscillator.connect(gain).connect(master);
  voices.add(oscillator);
  oscillator.onended=()=>voices.delete(oscillator);
  oscillator.start(start);
  oscillator.stop(start+duration+.08);
}

function schedulePhrase(){
  if(!audioContext||audioContext.state==="closed")return;
  const now=audioContext.currentTime+.05;
  const root=notes[Math.floor(Math.random()*3)];
  [0,3.1,6.2,9.3].forEach((offset,index)=>{
    const note=notes[(notes.indexOf(root)+index*2)%notes.length];
    makeVoice(note,now+offset,5.8,.035,"sine");
    makeVoice(note/2,now+offset,7.4,.024,"triangle");
  });
  makeVoice(root*2,now+4.7,3.8,.012,"sine");
}

async function startAmbient(){
  const AudioEngine=window.AudioContext||window.webkitAudioContext;
  if(!AudioEngine){
    playButton.setAttribute("aria-label","Ambient music is not supported by this browser");
    return;
  }
  try{
    audioContext=new AudioEngine();
    const filter=audioContext.createBiquadFilter();
    filter.type="lowpass";
    filter.frequency.value=1450;
    filter.Q.value=.7;
    master=audioContext.createGain();
    master.gain.value=.45;
    master.connect(filter).connect(audioContext.destination);
    await audioContext.resume();
    if(audioContext.state!=="running")throw new Error("Audio context did not start");
    schedulePhrase();
    phraseTimer=setInterval(schedulePhrase,12400);
    setPlayerState(true);
  }catch(error){
    console.warn("Ambient audio could not start.",error);
    if(audioContext&&audioContext.state!=="closed"){
      try{await audioContext.close()}catch(closeError){void closeError}
    }
    audioContext=null;
    master=null;
    setPlayerState(false);
  }
}

async function stopAmbient(){
  clearInterval(phraseTimer);
  voices.forEach(voice=>{
    try{voice.stop()}catch(error){void error}
  });
  voices.clear();
  if(audioContext&&audioContext.state!=="closed")await audioContext.close();
  audioContext=null;
  master=null;
  setPlayerState(false);
}

playButton.addEventListener("click",async()=>{
  playButton.disabled=true;
  try{
    if(playing)await stopAmbient();
    else await startAmbient();
  }finally{
    playButton.disabled=false;
  }
});

document.querySelectorAll(".project").forEach(card=>{
  card.addEventListener("keydown",event=>{
    if(event.key==="Enter"){
      const link=card.querySelector("a");
      if(link)link.click();
    }
  });
});

const nowCards=[...document.querySelectorAll(".now-card")];
if(hoverPointer){
  nowCards.forEach(card=>{
    card.addEventListener("pointerenter",()=>card.classList.add("is-pointer-active"));
    card.addEventListener("pointerleave",()=>card.classList.remove("is-pointer-active"));
    card.addEventListener("pointercancel",()=>card.classList.remove("is-pointer-active"));
  });
}else{
  if("IntersectionObserver" in window){
    const nowMotionObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>entry.target.classList.toggle("is-pointer-active",entry.isIntersecting));
    },{threshold:.45,rootMargin:"-8% 0px -8% 0px"});
    nowCards.forEach(card=>nowMotionObserver.observe(card));
  }else{
    nowCards.forEach(card=>card.classList.add("is-pointer-active"));
  }
}

if(finePointer&&hoverPointer){
  const nowStrip=document.querySelector(".now-strip");
  const toolkitGrid=document.querySelector(".toolkit-grid");
  [...document.querySelectorAll(".toolkit-grid .tool-card")].forEach((card,index)=>{
    card.style.setProperty("--tool-index",index);
  });

  const playDesktopIntro=target=>{
    target.classList.add("desktop-intro");
    setTimeout(()=>target.classList.remove("desktop-intro","desktop-intro-ready"),1400);
  };

  if("IntersectionObserver" in window){
    toolkitGrid?.classList.add("desktop-intro-ready");
    const desktopNowObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        entry.target.classList.toggle("desktop-in-view",entry.isIntersecting);
      });
    },{threshold:.05,rootMargin:"0px 0px -4% 0px"});
    if(nowStrip)desktopNowObserver.observe(nowStrip);

    const desktopToolkitObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        playDesktopIntro(entry.target);
        desktopToolkitObserver.unobserve(entry.target);
      });
    },{threshold:.22,rootMargin:"0px 0px -8% 0px"});
    if(toolkitGrid)desktopToolkitObserver.observe(toolkitGrid);
  }else{
    if(nowStrip)nowStrip.classList.add("desktop-in-view");
    if(toolkitGrid){
      playDesktopIntro(toolkitGrid);
    }
  }
}

const mobileMotionEnabled=mobileViewport||coarsePointer||!hoverPointer;
if(mobileMotionEnabled){
  const mobileMotionSelector=[
    ".hero",
    ".now-card",
    ".work-section .section-head",
    ".project",
    ".story-section .section-head",
    ".story-note",
    ".timeline li",
    ".photo-section .section-head",
    ".photo-card",
    ".toolkit-title",
    ".tool-card",
    ".tool-cloud span",
    ".credentials > div",
    ".contact-card",
    ".contact-card .button",
    ".contact-section footer",
    ".music-dock"
  ].join(",");
  const mobileMotionTargets=[...document.querySelectorAll(mobileMotionSelector)];
  mobileMotionTargets.forEach(item=>item.classList.add("mobile-motion"));
  const mobileProjects=[...document.querySelectorAll(".project")];
  const selectMobileProject=project=>{
    mobileProjects.forEach(item=>item.classList.toggle("is-mobile-selected",item===project));
  };
  if(mobileProjects.length){
    if("IntersectionObserver" in window){
      const mobileProjectObserver=new IntersectionObserver(entries=>{
        const candidates=entries
          .filter(entry=>entry.isIntersecting)
          .sort((a,b)=>Math.abs((a.boundingClientRect.top+a.boundingClientRect.bottom)/2-innerHeight*.48)-Math.abs((b.boundingClientRect.top+b.boundingClientRect.bottom)/2-innerHeight*.48));
        if(candidates[0])selectMobileProject(candidates[0].target);
      },{threshold:.18,rootMargin:"0px"});
      mobileProjects.forEach(project=>mobileProjectObserver.observe(project));
    }else{
      selectMobileProject(mobileProjects[0]);
    }
    mobileProjects.forEach(project=>project.addEventListener("click",()=>selectMobileProject(project)));
  }
  const mobileScrollTargets=[...document.querySelectorAll([
    ".hero",
    ".work-section .section-head",
    ".story-section .section-head",
    ".photo-section .section-head",
    ".toolkit-title"
  ].join(","))];

  if(!reducedMotion){
    if("IntersectionObserver" in window){
      const mobileMotionObserver=new IntersectionObserver(entries=>{
        entries.forEach(entry=>entry.target.classList.toggle("is-mobile-active",entry.isIntersecting));
      },{threshold:.16,rootMargin:"-6% 0px -10% 0px"});
      mobileScrollTargets.forEach(item=>mobileMotionObserver.observe(item));
    }else{
      mobileScrollTargets.forEach(item=>item.classList.add("is-mobile-active"));
    }

    const tapTargets=[...new Set([
      ...mobileMotionTargets,
      ...document.querySelectorAll(".button, .text-link, .project-links a, .project-bottom > a, .rail-link, .play-button")
    ])];
    const tapTimers=new WeakMap();
    const pressTarget=target=>{
      const previous=tapTimers.get(target);
      if(previous)clearTimeout(previous);
      target.classList.add("is-tap-active");
    };
    const releaseTarget=target=>{
      const previous=tapTimers.get(target);
      if(previous)clearTimeout(previous);
      tapTimers.set(target,setTimeout(()=>target.classList.remove("is-tap-active"),420));
    };

    tapTargets.forEach(item=>{
      item.classList.add("mobile-tap-target");
      if("PointerEvent" in window){
        item.addEventListener("pointerdown",()=>pressTarget(item),{passive:true});
        item.addEventListener("pointerup",()=>releaseTarget(item),{passive:true});
        item.addEventListener("pointercancel",()=>releaseTarget(item),{passive:true});
        item.addEventListener("pointerleave",()=>releaseTarget(item),{passive:true});
      }else{
        item.addEventListener("touchstart",()=>pressTarget(item),{passive:true});
        item.addEventListener("touchend",()=>releaseTarget(item),{passive:true});
        item.addEventListener("touchcancel",()=>releaseTarget(item),{passive:true});
      }
    });
  }
}

if(finePointer){
  const hero=document.querySelector(".hero");
  if(hero){
    const status=hero.querySelector(".hero-status");
    const hello=hero.querySelector(".hello");
    const lines=[...hero.querySelectorAll(".hero-line")];
    const lede=hero.querySelector(".hero-lede");
    let heroX=0;
    let heroY=0;
    let heroFrame=null;

    const paintHero=()=>{
      if(status)status.style.transform=`translate3d(${heroX*2}px, ${heroY*2}px, 0)`;
      if(hello)hello.style.transform=`translate3d(${-heroX*3}px, ${-heroY*2}px, 0)`;
      if(lines[0])lines[0].style.transform=`translate3d(${heroX*6}px, ${heroY*3}px, 0)`;
      if(lines[1])lines[1].style.transform=`translate3d(${-heroX*5}px, ${-heroY*2.5}px, 0)`;
      if(lede)lede.style.transform=`translate3d(${heroX*2.5}px, ${heroY*1.5}px, 0)`;
      heroFrame=null;
    };

    hero.addEventListener("pointermove",event=>{
      const rect=hero.getBoundingClientRect();
      heroX=(event.clientX-rect.left)/rect.width-.5;
      heroY=(event.clientY-rect.top)/rect.height-.5;
      if(!heroFrame)heroFrame=requestAnimationFrame(paintHero);
    },{passive:true});
    hero.addEventListener("pointerleave",()=>{
      if(heroFrame)cancelAnimationFrame(heroFrame);
      heroFrame=null;
      heroX=0;
      heroY=0;
      [status,hello,...lines,lede].forEach(item=>item?.style.removeProperty("transform"));
    });
  }

  document.querySelectorAll(".work-section .section-head, .story-section .section-head, .photo-section .section-head, .toolkit-title").forEach(head=>{
    head.classList.add("interactive-section-head");
    const lead=head.querySelector(":scope > div");
    const label=head.querySelector(".section-number");
    const title=head.querySelector("h2");
    const copy=head.querySelector(":scope > p");
    let headFrame=null;
    let headX=0;
    let headY=0;

    const paintHead=()=>{
      if(lead)lead.style.transform=`translate3d(${headX*7}px, ${headY*4}px, 0)`;
      if(label)label.style.transform=`translate3d(${-headX*4}px, ${-headY*3}px, 0)`;
      if(title)title.style.transform=`translate3d(${headX*2}px, ${headY*2}px, 0)`;
      if(copy)copy.style.transform=`translate3d(${-headX*8}px, ${-headY*5}px, 0)`;
      headFrame=null;
    };

    head.addEventListener("pointermove",event=>{
      const rect=head.getBoundingClientRect();
      headX=(event.clientX-rect.left)/rect.width-.5;
      headY=(event.clientY-rect.top)/rect.height-.5;
      head.style.setProperty("--spot-x",`${event.clientX-rect.left}px`);
      head.style.setProperty("--spot-y",`${event.clientY-rect.top}px`);
      if(!headFrame)headFrame=requestAnimationFrame(paintHead);
    },{passive:true});
    head.addEventListener("pointerleave",()=>{
      if(headFrame)cancelAnimationFrame(headFrame);
      headFrame=null;
      headX=0;
      headY=0;
      [lead,label,title,copy].forEach(item=>item?.style.removeProperty("transform"));
      head.style.removeProperty("--spot-x");
      head.style.removeProperty("--spot-y");
    });
  });

  document.querySelectorAll(".now-card, .tool-card, .photo-card, .story-note").forEach(item=>{
    item.classList.add("cursor-tilt");
    item.addEventListener("pointermove",event=>{
      const rect=item.getBoundingClientRect();
      const x=(event.clientX-rect.left)/rect.width-.5;
      const y=(event.clientY-rect.top)/rect.height-.5;
      const isNote=item.classList.contains("story-note");
      const tilt=isNote?1.2:2.2;
      const lift=item.classList.contains("tool-card")?4:3;
      const base=isNote?"rotate(-1deg) ":"";
      item.style.transform=`${base}perspective(900px) rotateX(${-y*tilt}deg) rotateY(${x*tilt}deg) translateY(-${lift}px)`;
    },{passive:true});
    item.addEventListener("pointerleave",()=>item.style.removeProperty("transform"));
  });

  document.querySelectorAll(".timeline li, .credentials > div, .contact-card, .story-note").forEach(item=>{
    item.addEventListener("pointermove",event=>{
      const rect=item.getBoundingClientRect();
      item.style.setProperty("--spot-x",`${event.clientX-rect.left}px`);
      item.style.setProperty("--spot-y",`${event.clientY-rect.top}px`);
    },{passive:true});
    item.addEventListener("pointerleave",()=>{
      item.style.removeProperty("--spot-x");
      item.style.removeProperty("--spot-y");
    });
  });

  const contact=document.querySelector(".contact-card");
  if(contact){
    const contactParts=[
      contact.querySelector(".section-number"),
      contact.querySelector("h2"),
      contact.querySelector(":scope > p"),
      contact.querySelector(".contact-actions")
    ];
    contact.addEventListener("pointermove",event=>{
      const rect=contact.getBoundingClientRect();
      const x=(event.clientX-rect.left)/rect.width-.5;
      const y=(event.clientY-rect.top)/rect.height-.5;
      contact.style.transform=`perspective(1200px) rotateX(${-y*.7}deg) rotateY(${x*.7}deg) translateY(-2px)`;
      contactParts.forEach((part,index)=>{
        if(part)part.style.transform=`translate3d(${x*(index+1)*2}px, ${y*(index+1)}px, ${(index+1)*2}px)`;
      });
    },{passive:true});
    contact.addEventListener("pointerleave",()=>{
      contact.style.removeProperty("transform");
      contactParts.forEach(part=>part?.style.removeProperty("transform"));
    });
  }

  const pageFooter=document.querySelector("footer");
  if(pageFooter){
    const footerParts=[...pageFooter.children];
    pageFooter.addEventListener("pointermove",event=>{
      const rect=pageFooter.getBoundingClientRect();
      const x=(event.clientX-rect.left)/rect.width-.5;
      if(footerParts[0])footerParts[0].style.transform=`translateX(${x*5}px)`;
      if(footerParts[1])footerParts[1].style.transform=`translateX(${-x*5}px)`;
    },{passive:true});
    pageFooter.addEventListener("pointerleave",()=>footerParts.forEach(part=>part.style.removeProperty("transform")));
  }

  document.querySelectorAll(".button, .rail-mark, .rail-foot").forEach(item=>{
    item.addEventListener("pointermove",event=>{
      const rect=item.getBoundingClientRect();
      const x=((event.clientX-rect.left)/rect.width-.5)*6;
      const y=((event.clientY-rect.top)/rect.height-.5)*6;
      const rotation=item.classList.contains("rail-mark")?" rotate(-5deg)":"";
      item.style.transform=`translate(${x}px, ${y-2}px)${rotation}`;
    },{passive:true});
    item.addEventListener("pointerleave",()=>item.style.removeProperty("transform"));
  });
}

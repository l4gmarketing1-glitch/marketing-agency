const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let motion = !reduced.matches;
const root = document.documentElement;
const reveals = [...document.querySelectorAll<HTMLElement>('.reveal')];
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
}, { threshold: 0.06 });
if (motion) { root.classList.add('js-motion'); reveals.forEach(el => observer.observe(el)); }

const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle');
const mobileNav = document.querySelector<HTMLElement>('#mobile-nav');
function closeMenu() {
  if (!toggle || !mobileNav) return;
  toggle.setAttribute('aria-expanded','false'); toggle.setAttribute('aria-label','Deschide meniul');
  mobileNav.hidden = true; document.body.classList.remove('menu-open');
}
toggle?.addEventListener('click', () => {
  if (!mobileNav) return;
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Închide meniul' : 'Deschide meniul');
  mobileNav.hidden = !open; document.body.classList.toggle('menu-open', open);
});
mobileNav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') { closeMenu(); toggle.focus(); } });
window.matchMedia('(min-width: 761px)').addEventListener('change', e=>{if(e.matches)closeMenu()});

const hero = document.querySelector<HTMLElement>('.hero-scroll');
const video = document.querySelector<HTMLVideoElement>('#hero-video');
const bar = document.querySelector<HTMLElement>('.hero-progress span');
const chapters = [...document.querySelectorAll<HTMLElement>('.hero-chapters span')];
const opening = document.querySelector<HTMLElement>('.studio-opening');
const sceneChapters = [...document.querySelectorAll<HTMLElement>('.scene-chapter')];
const sceneNumber = document.querySelector<HTMLElement>('#scene-number');
const motionButton = document.querySelector<HTMLButtonElement>('.motion-toggle');
let target = 0;
let scheduled = false;
const connection = (navigator as Navigator & {connection?: {saveData?: boolean; effectiveType?: string}}).connection;
const canLoadVideo = !connection?.saveData && !['slow-2g','2g'].includes(connection?.effectiveType || '');
function seek() {
  if (motion && video && video.readyState >= 2 && !video.seeking && Number.isFinite(video.duration)) {
    const t = target * Math.max(0,video.duration - .05);
    if (Math.abs(video.currentTime - t) > .035) video.currentTime = t;
  }
}
function updateHero() {
  scheduled = false;
  if (!hero) return;
  const rect = hero.getBoundingClientRect();
  target = Math.max(0,Math.min(1,-rect.top / Math.max(1,hero.offsetHeight - innerHeight)));
  if(bar) bar.style.transform = `scaleX(${target})`;
  hero.style.setProperty('--hero-progress',String(motion ? target : 0));
  chapters.forEach((el,i)=>el.classList.toggle('active',i===Math.min(2,Math.floor(target*3))));
  const storyProgress = motion ? target : 0;
  if (opening) {
    opening.style.opacity = String(Math.max(0, 1 - storyProgress * 4.5));
    opening.style.transform = `translateY(${-storyProgress * 100}px) scale(${1 - storyProgress * .08})`;
    opening.style.pointerEvents = storyProgress > .22 ? 'none' : 'auto';
    opening.querySelectorAll<HTMLAnchorElement>('a').forEach(a => a.tabIndex = storyProgress > .22 ? -1 : 0);
  }
  const chapterIndex = Math.min(2, Math.max(0, Math.floor((storyProgress - .23) / .25)));
  sceneChapters.forEach((el, i) => el.classList.toggle('is-active', storyProgress > .24 && storyProgress < .98 && i === chapterIndex));
  if (sceneNumber) sceneNumber.textContent = String(chapterIndex + 1).padStart(2, '0');
  if (rect.bottom > 0 && rect.top < innerHeight) seek();
}
function schedule() { if(!scheduled) {scheduled=true; requestAnimationFrame(updateHero);} }
function loadVideo() {
  if(!video || !motion || !canLoadVideo || video.src) return;
  video.src = video.dataset.src!;
  video.preload='auto';
  video.load();
}
video?.addEventListener('loadeddata',()=>{video.classList.add('is-ready');schedule()});
video?.addEventListener('seeked',seek);
video?.addEventListener('error',()=>video.classList.remove('is-ready'));
if(hero){
  addEventListener('scroll',schedule,{passive:true}); addEventListener('resize',schedule,{passive:true});
  // Give HTML, styles, fonts, and the still poster priority over the video.
  if ('requestIdleCallback' in window) window.requestIdleCallback(loadVideo,{timeout:1800}); else setTimeout(loadVideo,1000);
  schedule();
}
function setMotion(enabled:boolean) {
  motion=enabled; root.classList.toggle('motion-off',!enabled);
  motionButton?.setAttribute('aria-pressed',String(enabled));
  motionButton?.setAttribute('aria-label',enabled?'Mișcare ON: oprește animațiile':'Mișcare OFF: pornește animațiile');
  const label=motionButton?.querySelector('span'); if(label)label.textContent=enabled?'ON':'OFF';
  if(enabled){loadVideo();schedule()} else {reveals.forEach(el=>el.classList.add('visible'));video?.pause();schedule();}
}
motionButton?.addEventListener('click',()=>setMotion(!motion));
reduced.addEventListener('change',e=>setMotion(!e.matches));
setMotion(motion);
if(window.matchMedia('(pointer:fine)').matches) {
  document.querySelectorAll<HTMLElement>('.tilt-card').forEach(card=>{
    card.addEventListener('pointermove', e=>{
      if(!motion)return;
      const r=card.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
      card.style.transform=`rotateX(${-y*4}deg) rotateY(${x*4}deg)`;
    });
    card.addEventListener('pointerleave',()=>card.style.removeProperty('transform'));
  });
}
const form = document.querySelector<HTMLFormElement>('#brief-form');
form?.addEventListener('submit',e=>{
  e.preventDefault();
  if(!form.reportValidity())return;
  const data=new FormData(form);
  const subject=`Proiect L4G: ${data.get('service')}`;
  const body=`Nume: ${data.get('name')}\nEmail: ${data.get('email')}\nServiciu: ${data.get('service')}\n\n${data.get('message')}`;
  const url=`mailto:contact@l4g.ro?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const status=document.querySelector<HTMLElement>('#form-status');
  if(status) status.textContent='Am pregătit mesajul în aplicația ta de email. Apasă Trimite acolo pentru a-l expedia. Dacă aplicația nu s-a deschis, scrie-ne la contact@l4g.ro.';
  const emailLink=document.createElement('a');
  emailLink.href=url; emailLink.target='_blank'; emailLink.rel='noopener noreferrer';
  emailLink.click();
});

const labContent: Record<string, {index: string; title: string[]; copy: string; path: string}> = {
  ads: {index:'01 / GOOGLE ADS',title:['Aduci oamenii','potriviți.'],copy:'Campaniile atrag atenția. Website-ul transformă interesul în acțiune, iar brandul dă un motiv să fii ales.',path:'/servicii/google-ads/'},
  web: {index:'02 / WEB DESIGN',title:['Faci următorul pas','să pară firesc.'],copy:'Un website bun continuă promisiunea din reclamă. Clarifică oferta, exprimă brandul și face contactul sau cumpărarea ușoare.',path:'/servicii/web-design/'},
  brand: {index:'03 / BRANDING',title:['Dai un motiv','să fii ținut minte.'],copy:'Identitatea leagă toate punctele de contact. Aceeași personalitate în campanie, pe website și în mintea oamenilor.',path:'/servicii/branding/'},
};
document.querySelectorAll<HTMLButtonElement>('[data-lab]').forEach(button => {
  button.addEventListener('click', () => {
    const content = labContent[button.dataset.lab!];
    document.querySelectorAll<HTMLButtonElement>('[data-lab]').forEach(node => {
      node.classList.toggle('active', node === button);
      node.setAttribute('aria-pressed', String(node === button));
    });
    document.querySelector('#lab-index')!.textContent = content.index;
    document.querySelector('#lab-copy')!.textContent = content.copy;
    const heading = document.querySelector('#lab-heading')!;
    heading.replaceChildren(document.createTextNode(content.title[0]), document.createElement('br'), document.createTextNode(content.title[1]));
    const link = document.querySelector<HTMLAnchorElement>('#lab-link')!;
    const prefix = location.pathname.startsWith('/marketing-agency/') ? '/marketing-agency' : '';
    link.href = prefix + content.path;
  });
});

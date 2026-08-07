// Home page only: sticky nav shadow, hero slider, active-nav-on-scroll
const nav = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 40) nav.querySelector('.glass').classList.add('shadow-2xl','bg-black/90');
  else nav.querySelector('.glass').classList.remove('shadow-2xl','bg-black/90');
});

const slides = document.querySelectorAll('.hero-slide');
const dotsWrap = document.getElementById('heroDots');
const slideData = [
  {eyebrow:'Muscle Gain With', heading:'Expert Coaching', sub:'Personalized strength programs for complete body transformation.'},
  {eyebrow:'Burn Fat, Build', heading:'Lean Strength', sub:'Fat loss training with personalized fitness guidance.'},
  {eyebrow:'Advanced Training For Every', heading:'Fitness Level', sub:'Beginner to advanced workouts designed for real results.'},
  {eyebrow:'Your Strength Journey', heading:'Starts Here', sub:'Premium equipment, expert trainers, and a space built to push your limits — right in Khajaguda, Hyderabad.'}
];
let current = 0;
const heroEyebrow = document.getElementById('heroEyebrow');
const heroHeading = document.getElementById('heroHeading');
const heroSub = document.getElementById('heroSub');

slides.forEach((_, i) => {
  const dot = document.createElement('button');
  dot.className = 'w-2.5 h-2.5 rounded-full bg-white/40 transition';
  dot.addEventListener('click', () => goTo(i));
  dotsWrap.appendChild(dot);
});
const dots = dotsWrap.querySelectorAll('button');

function render() {
  slides.forEach((s,i) => s.classList.toggle('active', i===current));
  dots.forEach((d,i) => {
    d.classList.toggle('bg-red-600', i===current);
    d.classList.toggle('w-7', i===current);
    d.classList.toggle('bg-white/40', i!==current);
  });
  heroEyebrow.textContent = slideData[current].eyebrow;
  heroHeading.textContent = slideData[current].heading;
  heroSub.textContent = slideData[current].sub;
}
function goTo(i){ current = (i+slides.length)%slides.length; render(); resetTimer(); }
function next(){ goTo(current+1); }
function prev(){ goTo(current-1); }
document.getElementById('heroNext').addEventListener('click', next);
document.getElementById('heroPrev').addEventListener('click', prev);
let timer = setInterval(next, 5500);
function resetTimer(){ clearInterval(timer); timer = setInterval(next, 5500); }
render();

const sections = ['home','about','services','membership','trainers','gallery','contact'].map(id=>document.getElementById(id));
const navLinks = document.querySelectorAll('.nav-link');
window.addEventListener('scroll', () => {
  let idx = 0;
  sections.forEach((s,i) => { if (s && window.scrollY >= s.offsetTop - 140) idx = i; });
  navLinks.forEach((l,i) => l.classList.toggle('active', i===idx));
});

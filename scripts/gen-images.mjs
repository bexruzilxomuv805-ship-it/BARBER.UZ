// Generates stylized SVG placeholder portraits & hero art for the barbershop site
// (no external stock photos are fetched — everything is drawn procedurally)
import { writeFileSync, mkdirSync } from 'fs';

const outDir = new URL('../src/assets/images/', import.meta.url);
mkdirSync(outDir, { recursive: true });

const palettes = [
  ['#2b2b2b', '#0a0a0a'],
  ['#3a2f14', '#0a0a0a'],
  ['#332b1a', '#0a0a0a'],
  ['#28241a', '#0a0a0a'],
  ['#2f2a1e', '#0a0a0a'],
  ['#221f1a', '#0a0a0a'],
];

function portrait(id, seed) {
  const [c1, c2] = palettes[seed % palettes.length];
  const hairH = 60 + (seed * 13) % 30;
  const beard = seed % 2 === 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
  <defs>
    <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <linearGradient id="gold${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f5ecc6"/>
      <stop offset="100%" stop-color="#c9a227"/>
    </linearGradient>
  </defs>
  <rect width="400" height="500" fill="url(#bg${id})"/>
  <circle cx="200" cy="500" r="230" fill="none" stroke="url(#gold${id})" stroke-width="1" opacity="0.25"/>
  <circle cx="200" cy="190" r="90" fill="#3a3229"/>
  <path d="M110 190 a90 90 0 0 1 180 0 v10 h-180 z" fill="#161311"/>
  <rect x="130" y="150" width="140" height="${hairH}" rx="30" fill="#161311"/>
  <path d="M140 260 q60 40 120 0 v40 q-60 60 -120 0 z" fill="#3a3229"/>
  ${beard ? '<path d="M135 230 q65 90 130 0 q10 60 -65 80 q-75 -20 -65 -80 z" fill="#161311" opacity="0.85"/>' : ''}
  <rect x="70" y="360" width="260" height="140" rx="18" fill="#111111"/>
  <rect x="70" y="360" width="260" height="10" fill="url(#gold${id})"/>
  <circle cx="150" cy="185" r="6" fill="#0a0a0a"/>
  <circle cx="250" cy="185" r="6" fill="#0a0a0a"/>
  <path d="M175 220 q25 15 50 0" stroke="#0a0a0a" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>`;
}

function heroArt(id) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900">
  <defs>
    <linearGradient id="hbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#181818"/>
      <stop offset="100%" stop-color="#050505"/>
    </linearGradient>
    <linearGradient id="hgold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f5ecc6"/>
      <stop offset="50%" stop-color="#c9a227"/>
      <stop offset="100%" stop-color="#6b511b"/>
    </linearGradient>
    <pattern id="stripes" width="40" height="40" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <rect width="20" height="40" fill="#c9a227" opacity="0.9"/>
      <rect x="20" width="20" height="40" fill="#f4f4f4" opacity="0.95"/>
    </pattern>
  </defs>
  <rect width="900" height="900" fill="url(#hbg)"/>
  <circle cx="450" cy="460" r="330" fill="none" stroke="url(#hgold)" stroke-width="2" opacity="0.35"/>
  <circle cx="450" cy="460" r="260" fill="none" stroke="url(#hgold)" stroke-width="1" opacity="0.25"/>
  <g transform="translate(450,460)">
    <rect x="-40" y="-260" width="80" height="360" rx="40" fill="url(#stripes)" stroke="#c9a227" stroke-width="4"/>
    <circle cy="-270" r="46" fill="#111"/>
    <circle cy="-270" r="46" fill="none" stroke="url(#hgold)" stroke-width="5"/>
    <circle cy="115" r="46" fill="#111"/>
    <circle cy="115" r="46" fill="none" stroke="url(#hgold)" stroke-width="5"/>
  </g>
  <g opacity="0.5">
    <circle cx="140" cy="150" r="5" fill="#c9a227"/>
    <circle cx="760" cy="200" r="4" fill="#c9a227"/>
    <circle cx="700" cy="720" r="6" fill="#c9a227"/>
    <circle cx="160" cy="700" r="4" fill="#c9a227"/>
  </g>
</svg>`;
}

const barbers = ['aziz', 'bekzod', 'jasur', 'sardor'];
barbers.forEach((name, i) => {
  writeFileSync(new URL(`barber-${name}.svg`, outDir), portrait(name, i));
});

writeFileSync(new URL('hero-art.svg', outDir), heroArt('hero'));

console.log('Generated', barbers.length + 1, 'SVG images in', outDir.pathname);

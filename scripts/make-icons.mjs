// Génère les icônes PWA dans public/. Usage : npm run icons
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

// Une carte crème sur fond vert sombre : une phrase dont un mot est masqué.
const svg = (r) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${r}" fill="#22382d"/>
  <rect x="112" y="136" width="288" height="240" rx="28" fill="#f6f3ec"/>
  <rect x="152" y="192" width="120" height="16" rx="8" fill="#22382d" opacity=".28"/>
  <rect x="288" y="192" width="72" height="16" rx="8" fill="#22382d" opacity=".28"/>
  <rect x="152" y="240" width="56" height="16" rx="8" fill="#22382d" opacity=".28"/>
  <rect x="224" y="232" width="136" height="32" rx="10" fill="#c8553d"/>
  <rect x="152" y="296" width="168" height="16" rx="8" fill="#22382d" opacity=".28"/>
</svg>`

writeFileSync('public/favicon.svg', svg(112))
const square = Buffer.from(svg(0))
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  await sharp(square, { density: 300 }).resize(size, size).png().toFile(`public/${name}`)
}
console.log('Icônes générées dans public/')

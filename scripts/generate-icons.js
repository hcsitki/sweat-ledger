const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const iconConcepts = path.join(rootDir, 'icon-concepts');
const assetsImages = path.join(rootDir, 'assets', 'images');

function renderSvgFile(svgPath, width = 1024) {
  const svg = fs.readFileSync(svgPath, 'utf-8');
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  return resvg.render().asPng();
}

function renderSvgString(svgString, width = 1024) {
  const resvg = new Resvg(svgString, { fitTo: { mode: 'width', value: width } });
  return resvg.render().asPng();
}

function write(pngPath, buffer) {
  fs.writeFileSync(pngPath, buffer);
  console.log(`  + ${path.relative(rootDir, pngPath)}`);
}

// Navy background + cream drop — used for iOS icon, splash, and favicon
const combinedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="#0C1825"/>
  <path d="M 512 150 C 512 320, 706 500, 706 642 A 194 194 0 0 1 318 642 C 318 500, 512 320, 512 150 Z"
        fill="none" stroke="#F0ECE4" stroke-width="24"/>
  <rect x="416" y="532" width="192" height="21" rx="10" fill="#F0ECE4"/>
  <rect x="394" y="599" width="237" height="21" rx="10" fill="#F0ECE4"/>
  <rect x="416" y="666" width="192" height="21" rx="10" fill="#F0ECE4"/>
</svg>`;

// Android adaptive icon layers
write(path.join(assetsImages, 'android-icon-foreground.png'),
  renderSvgFile(path.join(iconConcepts, 'android-foreground.svg')));

write(path.join(assetsImages, 'android-icon-background.png'),
  renderSvgFile(path.join(iconConcepts, 'android-background.svg')));

write(path.join(assetsImages, 'android-icon-monochrome.png'),
  renderSvgFile(path.join(iconConcepts, 'android-monochrome.svg')));

// iOS / cross-platform icons
write(path.join(assetsImages, 'icon.png'), renderSvgString(combinedSvg));
write(path.join(assetsImages, 'splash-icon.png'), renderSvgString(combinedSvg));
write(path.join(assetsImages, 'favicon.png'), renderSvgString(combinedSvg, 64));

console.log('\nDone.');

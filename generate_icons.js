// Generate PWA icons from logo.jpeg using sharp
const path = require('path');
const fs = require('fs');

const inputPath = path.join(__dirname, 'frontend/public/logo.jpeg');
const outputDir = path.join(__dirname, 'frontend/public');

async function generate() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    // Try from frontend node_modules
    try {
      sharp = require(path.join(__dirname, 'frontend/node_modules/sharp'));
    } catch {
      console.log('sharp not available, trying jimp...');
      await generateWithJimp();
      return;
    }
  }

  const sizes = [192, 512];
  for (const size of sizes) {
    await sharp(inputPath)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
      .png()
      .toFile(path.join(outputDir, `pwa-${size}.png`));
    console.log(`✅ Generated pwa-${size}.png`);
  }
}

async function generateWithJimp() {
  try {
    const Jimp = require(path.join(__dirname, 'frontend/node_modules/jimp'));
    const image = await Jimp.read(inputPath);
    for (const size of [192, 512]) {
      await image.clone().resize(size, size).writeAsync(path.join(outputDir, `pwa-${size}.png`));
      console.log(`✅ Generated pwa-${size}.png`);
    }
  } catch (e) {
    console.log('No image library available. Creating placeholder icons...');
    createSvgFallback();
  }
}

function createSvgFallback() {
  // Create simple SVG-based PNG substitute using a canvas-like approach
  // We'll just copy the logo.jpeg and rename — not ideal but works for testing
  fs.copyFileSync(inputPath, path.join(outputDir, 'pwa-192.png'));
  fs.copyFileSync(inputPath, path.join(outputDir, 'pwa-512.png'));
  console.log('⚠️  Copied logo.jpeg as placeholder — replace pwa-192.png and pwa-512.png with proper PNG icons for production');
}

generate().catch(e => {
  console.error(e.message);
  createSvgFallback?.();
});

function createSvgFallback() {
  fs.copyFileSync(inputPath, path.join(outputDir, 'pwa-192.png'));
  fs.copyFileSync(inputPath, path.join(outputDir, 'pwa-512.png'));
  console.log('⚠️  Copied logo.jpeg as placeholder — replace with proper PNG icons for production');
}

import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'fs';

async function generate() {
  const svgBuffer = fs.readFileSync('public/icon-source.svg');

  // pwa-512x512.png
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/pwa-512x512.png');

  // pwa-192x192.png
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/pwa-192x192.png');

  // apple-touch-icon.png
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');

  // Create temporary files for favicon
  await sharp(svgBuffer).resize(16, 16).png().toFile('public/fav-16.png');
  await sharp(svgBuffer).resize(32, 32).png().toFile('public/fav-32.png');
  await sharp(svgBuffer).resize(48, 48).png().toFile('public/fav-48.png');

  // Generate favicon.ico
  const buf = await pngToIco(['public/fav-16.png', 'public/fav-32.png', 'public/fav-48.png']);
  fs.writeFileSync('public/favicon.ico', buf);

  // Clean up
  fs.unlinkSync('public/fav-16.png');
  fs.unlinkSync('public/fav-32.png');
  fs.unlinkSync('public/fav-48.png');
  
  console.log('Icons generated successfully.');
}

generate().catch(console.error);

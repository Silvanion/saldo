import sharp from 'sharp';

sharp('build/icon.svg')
  .resize(512, 512)
  .png()
  .toFile('build/icon.png')
  .then(() => console.log('Icon converted successfully'))
  .catch(console.error);

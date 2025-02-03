const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Assurez-vous que le dossier assets existe
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR);
}

async function generateIcons() {
  // Créer une image de base avec un fond uni
  const baseImage = sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 42, g: 45, b: 54, alpha: 1 }
    }
  });

  // Générer icon.png
  await baseImage
    .clone()
    .resize(1024, 1024)
    .toFile(path.join(ASSETS_DIR, 'icon.png'));

  // Générer adaptive-icon.png
  await baseImage
    .clone()
    .resize(1024, 1024)
    .toFile(path.join(ASSETS_DIR, 'adaptive-icon.png'));

  // Générer splash.png
  await sharp({
    create: {
      width: 2048,
      height: 2048,
      channels: 4,
      background: { r: 42, g: 45, b: 54, alpha: 1 }
    }
  })
    .toFile(path.join(ASSETS_DIR, 'splash.png'));

  console.log('Icons generated successfully!');
}

generateIcons().catch(console.error); 
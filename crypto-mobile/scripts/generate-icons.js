const Jimp = require('jimp');

async function generateIcons() {
  // Créer une image de base
  const image = new Jimp(1024, 1024, '#2a2d36');
  
  // Ajouter du texte
  const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
  image.print(font, 256, 456, 'CS');

  // Sauvegarder les différentes versions
  await image.writeAsync('./assets/icon.png');
  await image.writeAsync('./assets/adaptive-icon.png');
  
  // Créer le splash screen
  const splash = new Jimp(2048, 2048, '#2a2d36');
  await splash.writeAsync('./assets/splash.png');
}

generateIcons().catch(console.error); 
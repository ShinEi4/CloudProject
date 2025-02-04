import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

export async function createDefaultIcons() {
  const iconContent = `
    <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#2a2d36"/>
      <text x="50%" y="50%" font-family="Arial" font-size="120" fill="#bfb699" text-anchor="middle" dy=".3em">CS</text>
    </svg>
  `;

  const paths = {
    icon: FileSystem.documentDirectory + 'icon.png',
    adaptiveIcon: FileSystem.documentDirectory + 'adaptive-icon.png',
    splash: FileSystem.documentDirectory + 'splash.png'
  };

  await FileSystem.writeAsStringAsync(paths.icon, iconContent, {
    encoding: FileSystem.EncodingType.UTF8
  });

  // Copier le même fichier pour les autres icônes
  await FileSystem.copyAsync({
    from: paths.icon,
    to: paths.adaptiveIcon
  });

  await FileSystem.copyAsync({
    from: paths.icon,
    to: paths.splash
  });

  return paths;
} 
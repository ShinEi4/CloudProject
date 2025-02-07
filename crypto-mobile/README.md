# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.


Commandes utiles : 
- Cela gardera votre projet plus léger et mieux organisé
   npm uninstall expo-status-bar

- Pour run projet :
   npx expo start

## TUTO build apk
Executer dans le terminal de crypto-mobile:
- eas login
- npx eas build:configure :
   . selectionner: All
   . selectionner: Yes
   . selectionner: Yes
- npx eas build --profile preview --platform android

   Structure de app.json:
   {
      "expo": {
         "name": "Crypto Sync",
         "slug": "crypto-mobile",
         "version": "1.0.0",
         "scheme": "cryptosync",
         "orientation": "portrait",
         "userInterfaceStyle": "dark",
         "icon": "./assets/images/icon-foreground.png",
         "splash": {
            "resizeMode": "contain",
            "backgroundColor": "#2a2d36"
         },
         "assetBundlePatterns": [
            "**/*"
         ],
         "ios": {
            "supportsTablet": true
         },
         "android": {
            "adaptiveIcon": {
            "backgroundColor": "#2a2d36"
            },
            "permissions": [
            "android.permission.CAMERA",
            "android.permission.RECORD_AUDIO",
            "android.permission.CAMERA",
            "android.permission.RECORD_AUDIO"
            ],
            "package": "com.anjely.cryptomobile"
         },
         "plugins": [
            "expo-font",
            [
            "expo-camera",
            {
               "cameraPermission": "Permettez à $(PRODUCT_NAME) d'accéder à votre caméra."
            }
            ],
            [
            "expo-image-picker",
            {
               "photosPermission": "Permettez à $(PRODUCT_NAME) d'accéder à vos photos."
            }
            ],
            [
            "expo-splash-screen",
            {
               "image": "./assets/splashscreen_logo.png",
               "resizeMode": "contain",
               "backgroundColor": "#ffffff"
            }
            ]
         ],
         "newArchEnabled": true,
         "extra": {
            "eas": {
            "projectId": "5c89097d-de23-401a-ae46-1a1f6faa86cc" 
            (A changer par celui generer par eas build:configure)
            }
         },
         "runtimeVersion": {
            "policy": "appVersion"
         },
         "updates": {
            "url": "https://u.expo.dev/5c89097d-de23-401a-ae46-1a1f6faa86cc"
            (A changer par celui generer par eas build:configure)
         }
      }
   }


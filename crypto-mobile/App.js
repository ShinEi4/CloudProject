import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import TabNavigator from './src/navigation/TabNavigator';
import { initializeApp } from 'firebase/app';
import firebaseConfig from './src/config/firebase-config';

const Stack = createNativeStackNavigator();

// Initialiser Firebase une seule fois au démarrage de l'app
const app = initializeApp(firebaseConfig);

export default function App() {
  const [fontsLoaded] = useFonts({
    'Orbitron': require('./src/assets/fonts/Orbitron-Regular.ttf'),
    'Exo2': require('./src/assets/fonts/Exo2-Regular.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#2a2d36' }
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="MainApp" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
} 
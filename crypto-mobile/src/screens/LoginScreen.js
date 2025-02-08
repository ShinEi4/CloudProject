import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, Animated, Dimensions, TouchableOpacity, Alert } from 'react-native';
import MonBouton from '../components/MonBouton';
import { authService } from '../services/authService';
import useNotifications from '../hooks/useNotifications';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [glowAnim] = useState(new Animated.Value(0));
  const { sendNotification } = useNotifications();

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const { isAuthenticated } = await authService.checkSession();
      if (isAuthenticated) {
        navigation.replace('MainApp');
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de session:', error);
    }
  };

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleLogin = async () => {
    try {
      // Validation des champs vides
      if (!email && !password) {
        Alert.alert('Champs manquants', 'L\'email et le mot de passe sont requis');
        return;
      }
      if (!email) {
        Alert.alert('Email manquant', 'Veuillez entrer votre adresse email');
        return;
      }
      if (!password) {
        Alert.alert('Mot de passe manquant', 'Veuillez entrer votre mot de passe');
        return;
      }

      // Validation du format email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Alert.alert(
          'Format email invalide',
          'Veuillez entrer une adresse email valide (exemple: nom@gmail.com)'
        );
        return;
      }

      const response = await authService.login({ email, password });
      
      if (response.success) {
        await sendNotification(
          'Connexion réussie',
          'Bienvenue sur ItCoin !'
        );
        navigation.replace('MainApp');
      }
    } catch (error) {
      await sendNotification(
        'Erreur de connexion',
        error.message
      );
      console.error('Erreur de connexion:', error);
      let errorMessage = 'Une erreur est survenue lors de la connexion';
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'L\'adresse email n\'est pas valide';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Ce compte a été désactivé';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Aucun compte n\'existe avec cette adresse email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Mot de passe incorrect';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Trop de tentatives échouées. Veuillez réessayer plus tard';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Erreur de connexion réseau. Vérifiez votre connexion internet';
          break;
      }
      
      Alert.alert('Erreur de connexion', errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.glowContainer,
          {
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.5, 0.8],
            }),
          },
        ]}
      />
      <View style={styles.formContainer}>
        <Text style={styles.title}>CONNEXION</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>IDENTIFIANT</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholderTextColor="#bfb699"
            placeholder="Entrez votre email"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>MOT DE PASSE</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#bfb699"
            placeholder="Entrez votre mot de passe"
          />
        </View>
        <MonBouton 
          titre="CONNEXION" 
          onPress={handleLogin}
        />
        
        <TouchableOpacity 
          style={styles.registerLink}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.registerText}>Créer un compte</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2a2d36',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#bfb699',
    opacity: 0.1,
  },
  formContainer: {
    width: width * 0.85,
    padding: 20,
    backgroundColor: 'rgba(42, 45, 54, 0.95)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#bfb699',
  },
  title: {
    fontSize: 32,
    color: '#bfb699',
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: 'bold',
    fontFamily: 'Orbitron',
    textShadowColor: '#bfb699',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: '#bfb699',
    marginBottom: 5,
    fontSize: 12,
    letterSpacing: 1,
    fontFamily: 'Exo2',
  },
  input: {
    backgroundColor: 'rgba(191, 182, 153, 0.1)',
    borderWidth: 1,
    borderColor: '#bfb699',
    borderRadius: 8,
    padding: 12,
    color: '#bfb699',
    fontSize: 16,
    fontFamily: 'Exo2',
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerText: {
    color: '#bfb699',
    fontSize: 14,
    fontFamily: 'Exo2',
    textDecorationLine: 'underline',
  },
});
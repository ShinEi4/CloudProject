import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, Animated, Dimensions, TouchableOpacity, Alert } from 'react-native';
import MonBouton from '../components/MonBouton';
import { authService } from '../services/authService';

const { width } = Dimensions.get('window');

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPinForm, setShowPinForm] = useState(false);
  const [glowAnim] = useState(new Animated.Value(0));

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

  const handleRegister = async () => {
    try {
      // Validation basique
      if (!username || !email || !password) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs');
        return;
      }

      // Validation email basique
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Alert.alert('Erreur', 'Veuillez entrer une adresse email valide');
        return;
      }

      // Validation mot de passe
      if (password.length < 6) {
        Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
        return;
      }

      const userData = {
        username,
        email,
        password
      };

      await authService.register(userData);
      Alert.alert('Succès', 'Veuillez vérifier votre email pour le code PIN');
      setShowPinForm(true);
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      Alert.alert(
        'Erreur',
        error.message || 'Une erreur est survenue lors de l\'inscription'
      );
    }
  };

  const handleVerifyPin = async () => {
    try {
      if (!pin) {
        Alert.alert('Erreur', 'Veuillez entrer le code PIN');
        return;
      }

      const verificationData = {
        email,
        pin
      };

      await authService.verifyRegistrationPin(verificationData);
      Alert.alert(
        'Succès',
        'Inscription terminée avec succès',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
    } catch (error) {
      console.error('Erreur de vérification PIN:', error);
      Alert.alert(
        'Erreur',
        error.message || 'Une erreur est survenue lors de la vérification du PIN'
      );
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
        <Text style={styles.title}>INSCRIPTION</Text>
        
        {!showPinForm ? (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>NOM D'UTILISATEUR</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholderTextColor="#bfb699"
                placeholder="Entrez votre nom d'utilisateur"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholderTextColor="#bfb699"
                placeholder="Entrez votre email"
                autoCapitalize="none"
                keyboardType="email-address"
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
                placeholder="Créez votre mot de passe"
              />
            </View>
            <MonBouton 
              titre="CRÉER LE COMPTE" 
              onPress={handleRegister}
            />
          </>
        ) : (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>CODE PIN</Text>
            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={setPin}
              placeholderTextColor="#bfb699"
              placeholder="Entrez le code reçu par email"
              keyboardType="number-pad"
            />
            <MonBouton 
              titre="VÉRIFIER LE PIN" 
              onPress={handleVerifyPin}
            />
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginText}>Déjà un compte ? Connectez-vous</Text>
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
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    color: '#bfb699',
    fontSize: 14,
    fontFamily: 'Exo2',
    textDecorationLine: 'underline',
  },
}); 
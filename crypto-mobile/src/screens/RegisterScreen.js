import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, Animated, Dimensions, TouchableOpacity, Alert } from 'react-native';
import MonBouton from '../components/MonBouton';
import { authService } from '../services/authService';

const { width } = Dimensions.get('window');

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      // Validation des champs vides
      if (!username && !email && !password) {
        Alert.alert('Champs manquants', 'Tous les champs sont requis pour l\'inscription');
        return;
      }
      if (!username) {
        Alert.alert('Nom d\'utilisateur manquant', 'Veuillez entrer un nom d\'utilisateur');
        return;
      }
      if (!email) {
        Alert.alert('Email manquant', 'Veuillez entrer une adresse email');
        return;
      }
      if (!password) {
        Alert.alert('Mot de passe manquant', 'Veuillez créer un mot de passe');
        return;
      }

      // Validation email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Alert.alert(
          'Format email invalide',
          'Veuillez entrer une adresse email valide (exemple: nom@gmail.com)'
        );
        return;
      }

      // Validation mot de passe
      if (password.length < 6) {
        Alert.alert(
          'Mot de passe trop court',
          'Le mot de passe doit contenir au moins 6 caractères pour des raisons de sécurité'
        );
        return;
      }

      const userData = {
        username,
        email,
        password
      };

      const response = await authService.register(userData);
      
      if (response.success) {
        Alert.alert(
          'Inscription réussie !',
          'Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.',
          [
            {
              text: 'Se connecter',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      let errorMessage = 'Une erreur est survenue lors de l\'inscription';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Cette adresse email est déjà utilisée par un autre compte';
          break;
        case 'auth/invalid-email':
          errorMessage = 'L\'adresse email n\'est pas valide';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'L\'inscription par email/mot de passe n\'est pas activée';
          break;
        case 'auth/weak-password':
          errorMessage = 'Le mot de passe est trop faible. Utilisez au moins 6 caractères';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Erreur de connexion réseau. Vérifiez votre connexion internet';
          break;
      }
      
      Alert.alert('Erreur d\'inscription', errorMessage);
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
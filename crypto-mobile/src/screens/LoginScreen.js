import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, Animated, Dimensions, TouchableOpacity } from 'react-native';
import MonBouton from '../components/MonBouton';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
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

  const handleLogin = async () => {
    // Simuler l'appel API
    console.log('Login attempt with:', email, password);
    setShowPinForm(true);
  };

  const handleVerifyPin = async () => {
    console.log('Verifying PIN:', pin);
    // Simuler la vérification du PIN
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
        
        {!showPinForm ? (
          <>
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
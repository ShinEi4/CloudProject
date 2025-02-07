import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  Alert, 
  ScrollView,
  Dimensions 
} from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import MonBouton from '../components/MonBouton';
import { authService } from '../services/authService';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [profileImage, setProfileImage] = useState(null);
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    loadUserData();
    checkCameraPermission();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('Aucun utilisateur connecté');
        return;
      }

      // Récupérer les données supplémentaires de l'utilisateur depuis Firestore
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      
      setUser({
        email: currentUser.email,
        username: userDoc.exists() ? userDoc.data().username : currentUser.email.split('@')[0],
        uid: currentUser.uid
      });

      // Récupérer le solde du portefeuille depuis Firestore
      const walletDoc = await getDoc(doc(db, 'portefeuilles', currentUser.uid));
      if (walletDoc.exists()) {
        setWalletBalance(walletDoc.data().solde || 0);
      }

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger les données utilisateur'
      );
    }
  };

  const checkCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin d\'accéder à votre caméra');
    }
  };

  const handleTakePhoto = async () => {
    Alert.alert(
      'Photo de profil',
      'Choisissez une option',
      [
        {
          text: 'Prendre une photo',
          onPress: takePicture
        },
        {
          text: 'Choisir depuis la galerie',
          onPress: pickImage
        },
        {
          text: 'Annuler',
          style: 'cancel'
        }
      ]
    );
  };

  const takePicture = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setProfileImage(result.assets[0].uri);
        // Uploader l'image vers votre serveur ici
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de prendre une photo');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setProfileImage(result.assets[0].uri);
        // Uploader l'image vers votre serveur ici
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner une image');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PROFIL</Text>
      </View>

      <View style={styles.profileSection}>
        <TouchableOpacity onPress={handleTakePhoto} style={styles.imageContainer}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <Image 
              source={require('../assets/img/rb_4707.png')} 
              style={styles.profileImage} 
            />
          )}
          <View style={styles.cameraButton}>
            <Text style={styles.cameraIcon}>📸</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>CRÉDITS</Text>
          <Text style={styles.balanceAmount}>{walletBalance} €</Text>
        </View>

        <View style={styles.actionButtons}>
          <MonBouton 
            titre="MON PORTEFEUILLE"
            onPress={() => navigation.navigate('Portfolio')}
            style={styles.portfolioButton}
          />
          <MonBouton 
            titre="INVESTIR"
            onPress={() => navigation.navigate('Cours')}
            style={styles.investButton}
          />
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Informations personnelles</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Nom d'utilisateur</Text>
            <Text style={styles.value}>{user?.username || 'Chargement...'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user?.email || 'Chargement...'}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2a2d36',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    color: '#bfb699',
    fontFamily: 'Orbitron',
    textAlign: 'center',
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  profileImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: '#bfb699',
  },
  cameraButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#bfb699',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    fontSize: 20,
  },
  balanceCard: {
    width: width * 0.9,
    padding: 20,
    backgroundColor: 'rgba(191, 182, 153, 0.1)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#bfb699',
    marginBottom: 20,
  },
  balanceLabel: {
    color: '#bfb699',
    fontSize: 16,
    fontFamily: 'Orbitron',
    marginBottom: 5,
  },
  balanceAmount: {
    color: '#bfb699',
    fontSize: 35,
    fontFamily: 'Exo2',
  },
  actionButtons: {
    width: width * 0.9,
    gap: 10,
  },
  portfolioButton: {
    backgroundColor: '#a09679',
  },
  investButton: {
    backgroundColor: '#596069',
  },
  infoSection: {
    padding: 20,
  },
  sectionTitle: {
    color: '#bfb699',
    fontSize: 20,
    fontFamily: 'Orbitron',
    marginBottom: 15,
  },
  infoCard: {
    backgroundColor: 'rgba(191, 182, 153, 0.1)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#bfb699',
    padding: 20,
  },
  infoRow: {
    marginBottom: 15,
  },
  label: {
    color: '#bfb699',
    fontSize: 14,
    fontFamily: 'Exo2',
    marginBottom: 5,
  },
  value: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Exo2',
  },
}); 
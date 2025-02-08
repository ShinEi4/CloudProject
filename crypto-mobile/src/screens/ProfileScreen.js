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
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { getApps, getApp, initializeApp } from 'firebase/app';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// 📌 Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCrCHzitWCYZZy4KekjOUaW233Fk47nZuY",
  authDomain: "photo-42523.firebaseapp.com",
  projectId: "photo-42523",
  storageBucket: "photo-42523.firebasestorage.app",
  messagingSenderId: "369707658277",
  appId: "1:369707658277:web:d20dd9091b304857a923cc"
};

// 📌 Initialisation Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [profileImage, setProfileImage] = useState(null);
  const [userBalance, setUserBalance] = useState(0);

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

      // 🔹 Récupérer les données utilisateur
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      
      const username = userDoc.exists() ? userDoc.data().username : currentUser.email.split('@')[0];
      const profileImg = userDoc.exists() ? userDoc.data().profileImage : null;

      setUser({
        email: currentUser.email,
        username: username,
        uid: currentUser.uid
      });

      if (profileImg) {
        setProfileImage(profileImg);
      }

      // 🔹 Récupérer le solde du portefeuille
      const walletDoc = await getDoc(doc(db, 'portefeuilles', currentUser.uid));
      if (walletDoc.exists()) {
        setWalletBalance(walletDoc.data().solde || 0);
      }

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      Alert.alert('Erreur', 'Impossible de charger les données utilisateur');
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
        { text: 'Prendre une photo', onPress: takePicture },
        { text: 'Choisir depuis la galerie', onPress: pickImage },
        { text: 'Annuler', style: 'cancel' }
      ]
    );
  };

  // 📌 Uploader l'image vers Cloudinary
  const uploadImageToCloudinary = async (imageUri) => {
    const data = new FormData();
    data.append("file", {
      uri: imageUri,
      type: "image/jpeg", 
      name: "profile.jpg"
    });
    data.append("upload_preset", "profile_pictures");
    data.append("cloud_name", "dlif5i6gl");

    try {
      const response = await fetch("https://api.cloudinary.com/v1_1/dlif5i6gl/image/upload", {
        method: "POST",
        body: data
      });

      const result = await response.json();
      if (result.secure_url) {
        setProfileImage(result.secure_url);
        await saveProfileImageToFirestore(result.secure_url);
      } else {
        Alert.alert("Erreur", "Échec de l'upload vers Cloudinary");
      }
    } catch (error) {
      console.error("Erreur d'upload Cloudinary :", error);
      Alert.alert("Erreur", "Une erreur est survenue lors de l'upload");
    }
  };

  // 📌 Sauvegarde de l'URL dans Firestore
  // 📌 Sauvegarde de l'URL dans Firestore
const saveProfileImageToFirestore = async (imageUrl) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userDocRef = doc(db, "users", currentUser.uid);

    // ✅ Log pour vérifier l'URL avant l'enregistrement
    console.log("URL enregistrée dans Firestore :", imageUrl);

    await setDoc(userDocRef, { profileImage: imageUrl }, { merge: true });

    // ✅ Log pour confirmer que l'enregistrement a réussi
    console.log("L'URL a été enregistrée avec succès !");
  } catch (error) {
    console.error("Erreur de sauvegarde :", error);
  }
};


  // 📌 Prendre une photo
  const takePicture = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        await uploadImageToCloudinary(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de prendre une photo");
    }
  };

  // 📌 Sélectionner une image
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        await uploadImageToCloudinary(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de sélectionner une image");
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

        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Solde disponible</Text>
          <Text style={styles.balanceValue}>{userBalance.toFixed(2)}€</Text>
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
            <Text style={styles.value}>
              {user?.username || 'Chargement...'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>
              {user?.email || 'Chargement...'}
            </Text>
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
  balanceContainer: {
    backgroundColor: 'rgba(191, 182, 153, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginVertical: 10,
    alignItems: 'center',
  },
  balanceValue: {
    color: '#fff',
    fontFamily: 'Orbitron',
    fontSize: 24,
  },
}); 
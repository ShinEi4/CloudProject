import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, collection, query, orderBy, limit, getDocs, doc, setDoc, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../config/firebase-config';
import app from '../firebase/firebase';

const { width } = Dimensions.get('window');

// Supprimer la configuration en dur
const db = getFirestore(app);

export default function CryptoCoursScreen() {
  const [cryptos, setCryptos] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const auth = getAuth();

  const fetchLatestPrices = async () => {
    try {
      const cryptoMap = new Map();
      
      const coursRef = collection(db, 'cours-crypto');
      const q = query(coursRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const previousPrices = new Map();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const nomCrypto = data.nom_crypto.stringValue || data.nom_crypto;
        const prix = parseFloat(data.prix.doubleValue || data.prix);
        
        if (!cryptoMap.has(nomCrypto)) {
          cryptoMap.set(nomCrypto, {
            crypto: nomCrypto,
            prix: prix,
            previousPrix: null,
            isFavorite: favorites.includes(nomCrypto)
          });
        } else if (!previousPrices.has(nomCrypto)) {
          previousPrices.set(nomCrypto, prix);
        }
      });

      // Calculer les variations comme dans la version web
      const cryptoList = Array.from(cryptoMap.values()).map(crypto => {
        const previousPrix = previousPrices.get(crypto.crypto) || crypto.prix;
        const variation = previousPrix ? ((crypto.prix - previousPrix) / previousPrix) * 100 : 0;
        
        // Calculer le pourcentage pour la barre de progression comme dans crypto.js
        const percentage = Math.min(Math.abs(variation) * 2, 100); // Multiplier par 2 comme dans la version web
        
        return {
          ...crypto,
          variation: variation,
          percentage: percentage,
          cssClass: variation >= 0 ? 'bg-success' : 'bg-danger'
        };
      });

      cryptoList.sort((a, b) => b.prix - a.prix);
      setCryptos(cryptoList);
      setRefreshing(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des prix:', error);
      Alert.alert('Erreur', 'Impossible de récupérer les cours des cryptomonnaies');
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchLatestPrices();
  }, [favorites]);

  // Charger les favoris de l'utilisateur
  const loadUserFavorites = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const favorisRef = doc(db, 'crypto-favoris', userId);
      const favorisDoc = await getDoc(favorisRef);

      if (favorisDoc.exists()) {
        const { cryptos: favorisList } = favorisDoc.data();
        setFavorites(favorisList);
      } else {
        // Créer un document vide pour le nouvel utilisateur
        await setDoc(favorisRef, { cryptos: [] });
        setFavorites([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
    }
  };

  // Mettre à jour les favoris dans Firebase
  const updateUserFavorites = async (cryptoName, isFavorite) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Erreur', 'Vous devez être connecté pour gérer vos favoris');
        return;
      }

      const favorisRef = doc(db, 'crypto-favoris', userId);
      
      if (isFavorite) {
        await setDoc(favorisRef, {
          cryptos: arrayUnion(cryptoName)
        }, { merge: true });
      } else {
        await setDoc(favorisRef, {
          cryptos: arrayRemove(cryptoName)
        }, { merge: true });
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des favoris:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour vos favoris');
    }
  };

  const toggleFavorite = async (cryptoName) => {
    const updatedCryptos = cryptos.map(crypto => {
      if (crypto.crypto === cryptoName) {
        const newFavoriteStatus = !crypto.isFavorite;
        // Mettre à jour Firebase
        updateUserFavorites(cryptoName, newFavoriteStatus);
        
        if (newFavoriteStatus) {
          setFavorites(prev => [...prev, cryptoName]);
        } else {
          setFavorites(prev => prev.filter(fav => fav !== cryptoName));
        }
        return { ...crypto, isFavorite: newFavoriteStatus };
      }
      return crypto;
    });
    setCryptos(updatedCryptos);
  };

  // Charger les favoris au démarrage et quand l'utilisateur change
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadUserFavorites();
      } else {
        setFavorites([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchLatestPrices();
    const interval = setInterval(fetchLatestPrices, 10000);
    return () => clearInterval(interval);
  }, [favorites]);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>COURS CRYPTO</Text>
      </View>

      {favorites.length > 0 && (
        <View style={styles.favoritesSection}>
          <Text style={styles.sectionTitle}>MES FAVORIS</Text>
          {cryptos
            .filter(crypto => crypto.isFavorite)
            .map(crypto => (
              <CryptoCard 
                key={`fav-${crypto.crypto}`}
                crypto={crypto}
                onFavoritePress={toggleFavorite}
                isFavorite={true}
              />
            ))}
        </View>
      )}

      <View style={styles.allCryptosSection}>
        <Text style={styles.sectionTitle}>TOUS LES COURS</Text>
        {cryptos.map(crypto => (
          <CryptoCard 
            key={crypto.crypto}
            crypto={crypto}
            onFavoritePress={toggleFavorite}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function CryptoCard({ crypto, onFavoritePress }) {
  return (
    <View style={styles.cryptoCard}>
      <View style={styles.cryptoHeader}>
        <Text style={styles.cryptoName}>{crypto.crypto}</Text>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => onFavoritePress(crypto.crypto)}
        >
          <Ionicons
            name={crypto.isFavorite ? 'star' : 'star-outline'}
            size={24}
            color="#bfb699"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.cryptoDetails}>
        <Text style={styles.cryptoPrice}>{crypto.prix.toFixed(2)}€</Text>
        <Text style={[
          styles.cryptoVariation,
          { color: crypto.variation >= 0 ? '#4CAF50' : '#F44336' }
        ]}>
          {crypto.variation >= 0 ? '+' : ''}{crypto.variation.toFixed(2)}%
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { 
                width: `${crypto.percentage}%`,
                backgroundColor: crypto.variation >= 0 ? '#4CAF50' : '#F44336'
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {crypto.percentage.toFixed(1)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2a2d36',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#2a2d36',
  },
  headerTitle: {
    fontSize: 28,
    color: '#bfb699',
    fontFamily: 'Orbitron',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    color: '#bfb699',
    fontFamily: 'Orbitron',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  favoritesSection: {
    marginTop: 20,
  },
  allCryptosSection: {
    marginTop: 30,
  },
  cryptoCard: {
    backgroundColor: 'rgba(191, 182, 153, 0.1)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#bfb699',
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
  },
  cryptoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cryptoName: {
    fontSize: 18,
    color: '#bfb699',
    fontFamily: 'Orbitron',
  },
  favoriteButton: {
    padding: 5,
  },
  cryptoDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cryptoPrice: {
    fontSize: 20,
    color: '#fff',
    fontFamily: 'Exo2',
    fontWeight: 'bold',
  },
  cryptoVariation: {
    fontSize: 16,
    fontFamily: 'Exo2',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(191, 182, 153, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    color: '#bfb699',
    fontFamily: 'Exo2',
    fontSize: 14,
    width: 50,
    textAlign: 'right',
  },
}); 
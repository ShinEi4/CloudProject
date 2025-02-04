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

const { width } = Dimensions.get('window');

// Données simulées
const mockCryptoData = [
  {
    crypto: 'Bitcoin',
    prix: 42567.89,
    variation: 2.45,
    percentage: 75.5,
    isFavorite: false
  },
  {
    crypto: 'Ethereum',
    prix: 2234.56,
    variation: -1.23,
    percentage: 45.2,
    isFavorite: false
  },
  {
    crypto: 'Ripple',
    prix: 0.5432,
    variation: 5.67,
    percentage: 30.8,
    isFavorite: false
  },
  {
    crypto: 'Cardano',
    prix: 1.234,
    variation: -0.89,
    percentage: 25.4,
    isFavorite: false
  },
  {
    crypto: 'Solana',
    prix: 89.76,
    variation: 3.21,
    percentage: 62.3,
    isFavorite: false
  }
];

export default function CryptoCoursScreen() {
  const [cryptos, setCryptos] = useState(mockCryptoData);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState([]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simuler une mise à jour des données
    setTimeout(() => {
      const updatedCryptos = cryptos.map(crypto => ({
        ...crypto,
        prix: crypto.prix * (1 + (Math.random() * 0.1 - 0.05)),
        variation: crypto.variation + (Math.random() * 2 - 1),
      }));
      setCryptos(updatedCryptos);
      setRefreshing(false);
    }, 1000);
  }, [cryptos]);

  const toggleFavorite = (cryptoName) => {
    const updatedCryptos = cryptos.map(crypto => {
      if (crypto.crypto === cryptoName) {
        const newFavoriteStatus = !crypto.isFavorite;
        
        // Mettre à jour la liste des favoris
        if (newFavoriteStatus) {
          console.log(`Ajout aux favoris: ${cryptoName}`);
          setFavorites([...favorites, cryptoName]);
        } else {
          console.log(`Retrait des favoris: ${cryptoName}`);
          setFavorites(favorites.filter(fav => fav !== cryptoName));
        }
        
        return { ...crypto, isFavorite: newFavoriteStatus };
      }
      return crypto;
    });
    
    setCryptos(updatedCryptos);
  };

  useEffect(() => {
    // Simuler des mises à jour en temps réel
    const interval = setInterval(onRefresh, 10000);
    return () => clearInterval(interval);
  }, [onRefresh]);

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
          onPress={() => onFavoritePress(crypto.crypto)}
          style={styles.favoriteButton}
        >
          <Ionicons 
            name={crypto.isFavorite ? "star" : "star-outline"} 
            size={24} 
            color="#bfb699" 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.cryptoDetails}>
        <Text style={styles.cryptoPrice}>{crypto.prix.toFixed(2)}€</Text>
        <Text style={[
          styles.cryptoVariation,
          { color: crypto.variation >= 0 ? '#4CAF50' : '#f44336' }
        ]}>
          {crypto.variation >= 0 ? '+' : ''}{crypto.variation.toFixed(2)}%
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${crypto.percentage}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>{crypto.percentage.toFixed(1)}%</Text>
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
    backgroundColor: '#bfb699',
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
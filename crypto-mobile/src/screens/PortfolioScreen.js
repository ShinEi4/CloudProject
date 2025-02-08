import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Dimensions,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  FlatList
} from 'react-native';
import MonBouton from '../components/MonBouton';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import app from '../firebase/firebase';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const auth = getAuth(app);
const db = getFirestore(app);

function PortfolioContent() {
  const [portfolio, setPortfolio] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const [userEmail, setUserEmail] = useState(null);

  // Fonction pour obtenir l'email de l'utilisateur connecté
  const getUserEmail = () => {
    const user = auth.currentUser;
    if (user) {
      setUserEmail(user.email);
      return user.email;
    }
    return null;
  };

  // Fonction pour calculer le solde net de chaque crypto
  const calculateNetBalance = async (email) => {
    try {
      console.log('Calcul des soldes pour:', email);

      // Récupérer les achats
      const achatQuery = query(
        collection(db, 'achatCrypto'),
        where('email', '==', email)
      );
      const achatSnapshot = await getDocs(achatQuery);
      console.log('Nombre d\'achats trouvés:', achatSnapshot.size);

      // Récupérer les ventes
      const venteQuery = query(
        collection(db, 'venteCrypto'),
        where('email', '==', email)
      );
      const venteSnapshot = await getDocs(venteQuery);
      console.log('Nombre de ventes trouvées:', venteSnapshot.size);

      // Calculer les soldes nets par crypto
      const netBalances = new Map();

      // Ajouter les achats
      achatSnapshot.forEach(doc => {
        const data = doc.data();
        const crypto = data.cryptoName;
        const amount = parseFloat(data.quantite);
        const currentAmount = netBalances.get(crypto) || 0;
        netBalances.set(crypto, currentAmount + amount);
        console.log(`Achat ${crypto}:`, amount, 'Total:', currentAmount + amount);
      });

      // Soustraire les ventes
      venteSnapshot.forEach(doc => {
        const data = doc.data();
        const crypto = data.cryptoName;
        const amount = parseFloat(data.quantite);
        const currentAmount = netBalances.get(crypto) || 0;
        netBalances.set(crypto, currentAmount - amount);
        console.log(`Vente ${crypto}:`, amount, 'Total:', currentAmount - amount);
      });

      // Ne garder que les cryptos avec un solde positif
      const positiveBalances = Array.from(netBalances.entries())
        .filter(([_, balance]) => balance > 0)
        .map(([crypto, balance]) => ({
          crypto,
          montant: balance,
          prix_actuel: 0,
          valeur_totale: 0
        }));

      console.log('Soldes positifs:', positiveBalances);
      return positiveBalances;

    } catch (error) {
      console.error('Erreur lors du calcul des soldes:', error);
      return [];
    }
  };

  // Fonction pour obtenir les derniers prix
  const getLatestPrices = async (portfolioData) => {
    try {
      if (!portfolioData || portfolioData.length === 0) {
        return;
      }

      console.log('Récupération des prix pour:', portfolioData.map(p => p.crypto));

      // Récupérer les derniers prix pour chaque crypto
      const prixPromises = portfolioData.map(async (item) => {
        const prixQuery = query(
          collection(db, 'cours-crypto'),
          where('nom_crypto', '==', item.crypto),
          orderBy('date', 'desc'),
          limit(1)
        );

        const prixSnapshot = await getDocs(prixQuery);
        if (!prixSnapshot.empty) {
          const prixData = prixSnapshot.docs[0].data();
          console.log(`Prix trouvé pour ${item.crypto}:`, prixData.prix);
          return {
            ...item,
            prix_actuel: prixData.prix,
            valeur_totale: item.montant * prixData.prix
          };
        }
        console.log(`Aucun prix trouvé pour ${item.crypto}`);
        return item;
      });

      const updatedPortfolio = await Promise.all(prixPromises);
      console.log('Portfolio mis à jour avec les prix:', updatedPortfolio);

      setPortfolio(updatedPortfolio);
      setTotalValue(updatedPortfolio.reduce((acc, item) => acc + (item.valeur_totale || 0), 0));

    } catch (error) {
      console.error('Erreur lors de la mise à jour des prix:', error);
    }
  };

  // Charger le portfolio initial
  const loadPortfolio = async () => {
    try {
      const email = getUserEmail();
      if (!email) {
        console.log('Aucun email trouvé');
        return;
      }

      console.log('Chargement du portfolio pour:', email);

      // Calculer les soldes nets
      const netBalances = await calculateNetBalance(email);
      console.log('Soldes nets calculés:', netBalances);

      if (netBalances && netBalances.length > 0) {
        // Mettre à jour avec les derniers prix
        await getLatestPrices(netBalances);
      } else {
        console.log('Aucun solde trouvé');
        setPortfolio([]);
        setTotalValue(0);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Erreur', 'Impossible de charger le portefeuille');
    } finally {
      setRefreshing(false);
    }
  };

  // Mise à jour périodique des prix
  useEffect(() => {
    loadPortfolio();

    const priceInterval = setInterval(() => {
      loadPortfolio(); // Recharger complètement au lieu de juste mettre à jour les prix
    }, 10000);

    return () => clearInterval(priceInterval);
  }, []);

  // Ajouter un useEffect pour recharger quand l'email change
  useEffect(() => {
    if (userEmail) {
      loadPortfolio();
    }
  }, [userEmail]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadPortfolio();
  }, []);

  const handleBuy = (crypto) => {
    if (!userEmail) return;
    navigation.navigate('Transaction', {
      type: 'buy',
      crypto: crypto,
      currentPrice: crypto.prix_actuel,
      userEmail: userEmail
    });
  };

  const handleSell = (crypto) => {
    if (!userEmail) return;
    if (crypto.montant <= 0) {
      Alert.alert('Erreur', 'Vous ne possédez pas assez de cette cryptomonnaie');
      return;
    }
    navigation.navigate('Transaction', {
      type: 'sell',
      crypto: crypto,
      currentPrice: crypto.prix_actuel,
      maxAmount: crypto.montant,
      userEmail: userEmail
    });
  };


  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.portfolioSection}>
        <Text style={styles.sectionTitle}>SITUATION ACTUELLE</Text>
        <Text style={styles.totalValue}>Valeur totale: {totalValue.toFixed(2)}€</Text>
        {portfolio.map((item, index) => (
          <View key={`portfolio-${item.crypto}-${index}`} style={styles.cryptoCard}>
            <Text style={styles.cryptoName}>{item.crypto}</Text>
            <View style={styles.cryptoDetails}>
              <Text style={styles.cryptoAmount}>Quantité: {item.montant.toFixed(6)}</Text>
              <Text style={styles.cryptoValue}>Valeur: {item.valeur_totale.toFixed(2)}€</Text>
              <Text style={styles.cryptoPrice}>Prix: {item.prix_actuel.toFixed(2)}€</Text>
            </View>
            <View style={styles.actionButtons}>
              <MonBouton 
                titre="ACHETER"
                onPress={() => handleBuy(item)}
                style={styles.buyButton}
              />
              <MonBouton 
                titre="VENDRE"
                onPress={() => handleSell(item)}
                style={styles.sellButton}
              />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function HistoryContent() {
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userEmail, setUserEmail] = useState(null);

  // Récupérer l'email de l'utilisateur au chargement
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserEmail(user.email);
    }
  }, []);

  const loadTransactions = async () => {
    try {
      if (!userEmail) {
        console.log('Pas d\'email utilisateur');
        return;
      }

      console.log('Chargement des transactions pour:', userEmail);

      // Récupérer les achats
      const achatQuery = query(
        collection(db, 'achatCrypto'),
        where('email', '==', userEmail)
      );
      const achatSnapshot = await getDocs(achatQuery);
      console.log('Achats trouvés:', achatSnapshot.size);

      // Récupérer les ventes
      const venteQuery = query(
        collection(db, 'venteCrypto'),
        where('email', '==', userEmail)
      );
      const venteSnapshot = await getDocs(venteQuery);
      console.log('Ventes trouvées:', venteSnapshot.size);

      // Transformer les données
      const achats = achatSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'ACHAT',
        ...doc.data()
      }));

      const ventes = venteSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'VENTE',
        ...doc.data()
      }));

      // Combiner et trier par date
      const allTransactions = [...achats, ...ventes].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );

      console.log('Total transactions:', allTransactions.length);
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Erreur chargement transactions:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'historique');
    } finally {
      setRefreshing(false);
    }
  };

  // Charger les transactions au montage et quand l'email change
  useEffect(() => {
    if (userEmail) {
      loadTransactions();
    }
  }, [userEmail]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadTransactions();
  }, [userEmail]);

  const formatDate = (dateString) => {
    try {
      // Si la date est au format timestamp Firebase
      if (dateString?.seconds) {
        const date = new Date(dateString.seconds * 1000);
        return date.toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).replace(',', '');
      }
      
      // Si c'est une date normale
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.log('Date invalide:', dateString);
        return 'Date invalide';
      }

      return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).replace(',', '');
    } catch (error) {
      console.error('Erreur de formatage de date:', error);
      return 'Date invalide';
    }
  };

  const renderTransaction = ({ item }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <Text style={[
          styles.transactionType,
          { color: item.type === 'ACHAT' ? '#a09679' : '#596069' }
        ]}>
          {item.type}
        </Text>
        <Text style={styles.transactionDate}>
          {formatDate(item.date)}
        </Text>
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.cryptoName}>{item.cryptoName}</Text>
        <View style={styles.transactionRow}>
          <Text style={styles.transactionLabel}>Quantité:</Text>
          <Text style={styles.transactionValue}>
            {parseFloat(item.quantite).toFixed(6)}
          </Text>
        </View>
        <View style={styles.transactionRow}>
          <Text style={styles.transactionLabel}>Prix unitaire:</Text>
          <Text style={styles.transactionValue}>
            {parseFloat(item.prix).toFixed(2)}€
          </Text>
        </View>
        <View style={styles.transactionRow}>
          <Text style={styles.transactionLabel}>Total:</Text>
          <Text style={styles.transactionValue}>
            {parseFloat(item.montantTotal).toFixed(2)}€
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <FlatList
      data={transactions}
      renderItem={renderTransaction}
      keyExtractor={item => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Aucune transaction trouvée
          </Text>
        </View>
      }
      contentContainerStyle={styles.listContainer}
    />
  );
}

export default function PortfolioScreen() {
  const [activeTab, setActiveTab] = useState('portfolio');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PORTEFEUILLE</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            activeTab === 'portfolio' && styles.activeTabButton
          ]}
          onPress={() => setActiveTab('portfolio')}
        >
          <Text style={[
            styles.tabButtonText,
            activeTab === 'portfolio' && styles.activeTabButtonText
          ]}>SITUATION</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            activeTab === 'history' && styles.activeTabButton
          ]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[
            styles.tabButtonText,
            activeTab === 'history' && styles.activeTabButtonText
          ]}>HISTORIQUE</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'portfolio' ? <PortfolioContent /> : <HistoryContent />}
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#bfb699',
    backgroundColor: '#2a2d36',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 3,
    borderBottomColor: '#bfb699',
  },
  tabButtonText: {
    color: '#596069',
    fontFamily: 'Orbitron',
    fontSize: 14,
  },
  activeTabButtonText: {
    color: '#bfb699',
  },
  sectionTitle: {
    fontSize: 24,
    color: '#bfb699',
    fontFamily: 'Orbitron',
    padding: 20,
  },
  portfolioSection: {
    padding: 10,
  },
  cryptoCard: {
    backgroundColor: 'rgba(191, 182, 153, 0.1)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#bfb699',
    padding: 15,
    marginBottom: 15,
  },
  cryptoName: {
    fontSize: 18,
    color: '#bfb699',
    fontFamily: 'Orbitron',
    marginBottom: 10,
  },
  cryptoDetails: {
    marginBottom: 10,
  },
  cryptoAmount: {
    color: '#fff',
    fontFamily: 'Exo2',
    fontSize: 16,
  },
  cryptoValue: {
    color: '#fff',
    fontFamily: 'Exo2',
    fontSize: 16,
  },
  cryptoPrice: {
    color: '#fff',
    fontFamily: 'Exo2',
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  buyButton: {
    flex: 1,
    backgroundColor: '#a09679',
  },
  sellButton: {
    flex: 1,
    backgroundColor: '#596069',
  },
  historySection: {
    padding: 10,
  },
  transactionCard: {
    backgroundColor: 'rgba(191, 182, 153, 0.1)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#bfb699',
    padding: 15,
    marginBottom: 15,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  transactionType: {
    color: '#bfb699',
    fontFamily: 'Orbitron',
    fontSize: 16,
  },
  transactionDate: {
    color: '#bfb699',
    fontFamily: 'Exo2',
  },
  transactionDetails: {
    gap: 5,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  transactionLabel: {
    color: '#bfb699',
    fontFamily: 'Exo2',
    fontSize: 14,
  },
  transactionValue: {
    color: '#fff',
    fontFamily: 'Exo2',
    fontSize: 14,
  },
  transactionTotal: {
    color: '#fff',
    fontFamily: 'Exo2',
    fontWeight: 'bold',
  },
  filterSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(191, 182, 153, 0.2)',
  },
  filterTitle: {
    color: '#bfb699',
    fontFamily: 'Orbitron',
    fontSize: 16,
    marginBottom: 15,
  },
  dateFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateInputContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  filterLabel: {
    color: '#bfb699',
    fontFamily: 'Exo2',
    fontSize: 14,
    marginBottom: 5,
  },
  dateInput: {
    backgroundColor: 'rgba(191, 182, 153, 0.1)',
    borderWidth: 1,
    borderColor: '#bfb699',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    fontFamily: 'Exo2',
  },
  typeFilter: {
    marginBottom: 10,
  },
  typeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  typeButton: {
    flex: 1,
    backgroundColor: 'rgba(191, 182, 153, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  activeTypeButton: {
    backgroundColor: '#bfb699',
  },
  typeButtonText: {
    color: '#596069',
    fontFamily: 'Orbitron',
    fontSize: 12,
  },
  activeTypeButtonText: {
    color: '#2a2d36',
  },
  cryptoFilter: {
    marginBottom: 10,
  },
  cryptoButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  cryptoButton: {
    flex: 1,
    backgroundColor: 'rgba(191, 182, 153, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cryptoButtonText: {
    color: '#596069',
    fontFamily: 'Orbitron',
    fontSize: 12,
  },
  activeTypeButton: {
    backgroundColor: '#bfb699',
  },
  activeTypeButtonText: {
    color: '#2a2d36',
  },
  totalValue: {
    fontSize: 20,
    color: '#bfb699',
    fontFamily: 'Orbitron',
    textAlign: 'center',
    marginBottom: 15,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#596069',
    fontFamily: 'Exo2',
    fontSize: 16,
    textAlign: 'center',
  },
  listContainer: {
    padding: 10,
  },
}); 
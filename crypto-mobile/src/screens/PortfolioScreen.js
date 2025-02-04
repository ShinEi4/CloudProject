import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Dimensions,
  TouchableOpacity,
  RefreshControl,
  TextInput
} from 'react-native';
import MonBouton from '../components/MonBouton';

const { width } = Dimensions.get('window');

// Données simulées
const mockPortfolio = [
  {
    crypto: 'Bitcoin',
    montant: 0.05234,
    prix_actuel: 42567.89,
    valeur_totale: 2227.80
  },
  {
    crypto: 'Ethereum',
    montant: 1.5432,
    prix_actuel: 2234.56,
    valeur_totale: 3448.53
  },
  {
    crypto: 'Ripple',
    montant: 2500.00,
    prix_actuel: 0.5432,
    valeur_totale: 1358.00
  }
];

const mockTransactions = [
  {
    type: 'buy',
    crypto: 'Bitcoin',
    quantite: 0.02345,
    prix: 41234.56,
    montant_total: 967.45,
    date: '2024-02-15T10:30:00'
  },
  {
    type: 'sell',
    crypto: 'Ethereum',
    quantite: 0.5000,
    prix: 2198.76,
    montant_total: 1099.38,
    date: '2024-02-14T15:45:00'
  },
  {
    type: 'buy',
    crypto: 'Ripple',
    quantite: 1000.00,
    prix: 0.5234,
    montant_total: 523.40,
    date: '2024-02-13T09:15:00'
  }
];

function PortfolioContent() {
  const [portfolio, setPortfolio] = useState(mockPortfolio);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simuler un chargement
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.portfolioSection}>
        <Text style={styles.sectionTitle}>SITUATION ACTUELLE</Text>
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
                onPress={() => alert('Fonctionnalité à venir')}
                style={styles.buyButton}
              />
              <MonBouton 
                titre="VENDRE"
                onPress={() => alert('Fonctionnalité à venir')}
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
  const [transactions, setTransactions] = useState(mockTransactions);
  const [refreshing, setRefreshing] = useState(false);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'buy', 'sell'

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const filteredTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    const matchesDateRange = (!dateDebut || transactionDate >= new Date(dateDebut)) &&
                           (!dateFin || transactionDate <= new Date(dateFin));
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    return matchesDateRange && matchesType;
  });

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>FILTRES</Text>
        
        <View style={styles.dateFilters}>
          <View style={styles.dateInputContainer}>
            <Text style={styles.filterLabel}>Du</Text>
            <TextInput
              style={styles.dateInput}
              value={dateDebut}
              onChangeText={setDateDebut}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#596069"
            />
          </View>
          <View style={styles.dateInputContainer}>
            <Text style={styles.filterLabel}>Au</Text>
            <TextInput
              style={styles.dateInput}
              value={dateFin}
              onChangeText={setDateFin}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#596069"
            />
          </View>
        </View>

        <View style={styles.typeFilter}>
          <Text style={styles.filterLabel}>Type de transaction</Text>
          <View style={styles.typeButtons}>
            <TouchableOpacity 
              style={[
                styles.typeButton,
                typeFilter === 'all' && styles.activeTypeButton
              ]}
              onPress={() => setTypeFilter('all')}
            >
              <Text style={[
                styles.typeButtonText,
                typeFilter === 'all' && styles.activeTypeButtonText
              ]}>TOUS</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.typeButton,
                typeFilter === 'buy' && styles.activeTypeButton
              ]}
              onPress={() => setTypeFilter('buy')}
            >
              <Text style={[
                styles.typeButtonText,
                typeFilter === 'buy' && styles.activeTypeButtonText
              ]}>ACHATS</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.typeButton,
                typeFilter === 'sell' && styles.activeTypeButton
              ]}
              onPress={() => setTypeFilter('sell')}
            >
              <Text style={[
                styles.typeButtonText,
                typeFilter === 'sell' && styles.activeTypeButtonText
              ]}>VENTES</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>HISTORIQUE DES TRANSACTIONS</Text>
        {filteredTransactions.map((transaction, index) => (
          <View key={`transaction-${transaction.crypto}-${transaction.date}-${index}`} style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
              <Text style={[
                styles.transactionType,
                { color: transaction.type === 'buy' ? '#a09679' : '#596069' }
              ]}>
                {transaction.type === 'buy' ? 'ACHAT' : 'VENTE'}
              </Text>
              <Text style={styles.transactionDate}>
                {new Date(transaction.date).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.transactionDetails}>
              <Text style={styles.cryptoName}>{transaction.crypto}</Text>
              <Text style={styles.transactionAmount}>
                Quantité: {transaction.quantite.toFixed(6)}
              </Text>
              <Text style={styles.transactionPrice}>
                Prix: {transaction.prix.toFixed(2)}€
              </Text>
              <Text style={styles.transactionTotal}>
                Total: {transaction.montant_total.toFixed(2)}€
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
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
  transactionAmount: {
    color: '#fff',
    fontFamily: 'Exo2',
  },
  transactionPrice: {
    color: '#fff',
    fontFamily: 'Exo2',
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
}); 
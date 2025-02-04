import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TextInput,
  TouchableOpacity,
  Alert,
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MonBouton from '../components/MonBouton';

const { width } = Dimensions.get('window');

export default function TransactionScreen() {
  const [montant, setMontant] = useState('');
  const [type, setType] = useState('depot'); // 'depot' ou 'retrait'

  const handleSubmit = () => {
    if (!montant) {
      Alert.alert('Erreur', 'Veuillez entrer un montant');
      return;
    }

    // Simulation de l'envoi
    Alert.alert(
      'Demande envoyée',
      `Votre demande de ${type} de ${montant}€ a été envoyée avec succès.`,
      [{ text: 'OK', onPress: () => {
        setMontant('');
      }}]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DÉPÔT / RETRAIT</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.typeSelector}>
          <TouchableOpacity 
            style={[
              styles.typeButton,
              type === 'depot' && styles.activeTypeButton
            ]}
            onPress={() => setType('depot')}
          >
            <Ionicons 
              name="arrow-down-circle" 
              size={24} 
              color={type === 'depot' ? '#2a2d36' : '#bfb699'} 
            />
            <Text style={[
              styles.typeButtonText,
              type === 'depot' && styles.activeTypeButtonText
            ]}>DÉPÔT</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.typeButton,
              type === 'retrait' && styles.activeTypeButton
            ]}
            onPress={() => setType('retrait')}
          >
            <Ionicons 
              name="arrow-up-circle" 
              size={24} 
              color={type === 'retrait' ? '#2a2d36' : '#bfb699'} 
            />
            <Text style={[
              styles.typeButtonText,
              type === 'retrait' && styles.activeTypeButtonText
            ]}>RETRAIT</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>MONTANT (€)</Text>
          <TextInput
            style={styles.input}
            value={montant}
            onChangeText={setMontant}
            keyboardType="numeric"
            placeholder="Entrez le montant"
            placeholderTextColor="#596069"
          />

          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#bfb699" />
            <Text style={styles.infoText}>
              {type === 'depot' 
                ? "Le dépôt sera traité sous 24-48h ouvrées"
                : "Le retrait sera traité sous 2-3 jours ouvrés"}
            </Text>
          </View>

          <MonBouton 
            titre={`ENVOYER DEMANDE DE ${type.toUpperCase()}`}
            onPress={handleSubmit}
            style={styles.submitButton}
          />
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
  content: {
    padding: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(191, 182, 153, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    gap: 10,
  },
  activeTypeButton: {
    backgroundColor: '#bfb699',
  },
  typeButtonText: {
    color: '#bfb699',
    fontFamily: 'Orbitron',
    fontSize: 14,
  },
  activeTypeButtonText: {
    color: '#2a2d36',
  },
  formSection: {
    gap: 20,
  },
  label: {
    color: '#bfb699',
    fontFamily: 'Orbitron',
    fontSize: 14,
    marginBottom: 5,
  },
  input: {
    backgroundColor: 'rgba(191, 182, 153, 0.1)',
    borderWidth: 1,
    borderColor: '#bfb699',
    borderRadius: 8,
    padding: 15,
    color: '#fff',
    fontFamily: 'Exo2',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(191, 182, 153, 0.1)',
    padding: 15,
    borderRadius: 8,
    gap: 10,
  },
  infoText: {
    color: '#bfb699',
    fontFamily: 'Exo2',
    fontSize: 14,
    flex: 1,
  },
  submitButton: {
    marginTop: 20,
    backgroundColor: '#bfb699',
  },
}); 
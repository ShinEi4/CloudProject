import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';

const MonBouton = ({ onPress, titre }) => {
  return (
    <TouchableOpacity style={styles.bouton} onPress={onPress}>
      <Text style={styles.texte}>{titre}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  bouton: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfb699',
    marginTop: 10,
  },
  texte: {
    color: '#bfb699',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});

export default MonBouton; 
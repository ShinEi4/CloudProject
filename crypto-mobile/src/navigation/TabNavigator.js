import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import ProfileScreen from '../screens/ProfileScreen';
import PortfolioScreen from '../screens/PortfolioScreen';
import TransactionScreen from '../screens/TransactionScreen';
import CryptoCoursScreen from '../screens/CryptoCoursScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../services/authService';
import { Alert } from 'react-native';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const navigation = useNavigation();

  const handleLogout = async () => {
    try {
      Alert.alert(
        'Déconnexion',
        'Êtes-vous sûr de vouloir vous déconnecter ?',
        [
          {
            text: 'Annuler',
            style: 'cancel'
          },
          {
            text: 'Confirmer',
            onPress: async () => {
              await authService.logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la déconnexion');
    }
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Portfolio') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Transaction') {
            iconName = focused ? 'cash' : 'cash-outline';
          } else if (route.name === 'Cours') {
            iconName = focused ? 'trending-up' : 'trending-up-outline';
          } else if (route.name === 'Logout') {
            iconName = 'log-out-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#bfb699',
        tabBarInactiveTintColor: '#596069',
        tabBarStyle: {
          backgroundColor: '#2a2d36',
          borderTopColor: '#bfb699',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 10,
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: '#2a2d36',
          borderBottomColor: '#bfb699',
          borderBottomWidth: 1,
        },
        headerTintColor: '#bfb699',
        headerTitleStyle: {
          fontWeight: 'bold',
        }
      })}
    >
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          title: 'PROFIL',
          tabBarItemStyle: { marginBottom: 0 }
        }}
      />
      <Tab.Screen 
        name="Portfolio" 
        component={PortfolioScreen}
        options={{ 
          title: 'PORTEFEUILLE',
          tabBarItemStyle: { marginBottom: 0 }
        }}
      />
      <Tab.Screen 
        name="Cours" 
        component={CryptoCoursScreen}
        options={{ 
          title: 'COURS',
          tabBarItemStyle: { marginBottom: 0 }
        }}
      />
      <Tab.Screen 
        name="Transaction" 
        component={TransactionScreen}
        options={{ 
          title: 'DÉPÔT/RETRAIT',
          tabBarItemStyle: { marginBottom: 0 }
        }}
      />
      <Tab.Screen 
        name="Logout"
        component={EmptyComponent}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            handleLogout();
          },
        }}
        options={{
          title: 'DÉCONNEXION',
          tabBarItemStyle: { marginBottom: 0 },
          headerShown: false
        }}
      />
    </Tab.Navigator>
  );
}

// Composant vide pour l'onglet de déconnexion
const EmptyComponent = () => null; 
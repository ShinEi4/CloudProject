import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import ProfileScreen from '../screens/ProfileScreen';
import PortfolioScreen from '../screens/PortfolioScreen';
import TransactionScreen from '../screens/TransactionScreen';
import CryptoCoursScreen from '../screens/CryptoCoursScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
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
          }

          return <Ionicons key={route.key} name={iconName} size={size} color={color} />;
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
        headerShown: false
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
    </Tab.Navigator>
  );
} 
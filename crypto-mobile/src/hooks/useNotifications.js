import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { authService } from '../services/authService';
import { getFirestore, collection, addDoc, doc, getDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';
import app from '../firebase/firebase';

const db = getFirestore(app);

export default function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notification, setNotification] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      setExpoPushToken(token);
      if (token) {
        sendTokenToFirebase(token);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const sendTokenToFirebase = async (token) => {
    try {
      const user = authService.getCurrentUser();
      if (!user || !user.email) return;

      // Vérifier si un document avec cet email existe déjà
      const fcmTokenRef = collection(db, 'fcmToken');
      const q = query(fcmTokenRef, where('email', '==', user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Mise à jour du document existant
        const docRef = doc(db, 'fcmToken', querySnapshot.docs[0].id);
        await updateDoc(docRef, {
          fcmToken: token,
          updatedAt: new Date().toISOString()
        });
        console.log('FCM Token updated in Firebase');
      } else {
        // Création d'un nouveau document
        await addDoc(fcmTokenRef, {
          email: user.email,
          fcmToken: token,
          updatedAt: new Date().toISOString()
        });
        console.log('New FCM Token saved to Firebase');
      }
    } catch (error) {
      console.error('Error saving FCM token to Firebase:', error);
    }
  };

  return {
    sendNotification: async (title, body) => {
      await schedulePushNotification(title, body);
    },
    expoPushToken,
    notification
  };
}

async function schedulePushNotification(title, body) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: title,
      body: body,
      data: { data: 'goes here' },
    },
    trigger: null,
  });
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Échec de l\'obtention des permissions pour les notifications!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    alert('Les notifications nécessitent un appareil physique');
  }

  return token;
} 
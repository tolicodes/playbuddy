import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function handleRegistrationError(errorMessage: string) {
  alert(errorMessage);
  throw new Error(errorMessage);
}


// we will use this later
async function sendPushNotification(expoPushToken: string, availableCardsToSwipe: number) {
  const message = {
    to: expoPushToken,
    title: `${availableCardsToSwipe} new events!`,
    body: 'Swipe through and add favorites to your calendar.',
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

// we currently use this to schedule a daily notification
async function scheduleDailyNotification(availableCardsToSwipe: number) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${availableCardsToSwipe} new events!`,
      body: 'Swipe through and add favorites to your calendar.',
    },
    trigger: {
      // 4:32PM
      hour: 12 + 4,
      minute: 32,
      repeats: true,
    },
  });
}

// received from server, currently not used
async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      handleRegistrationError('Permission not granted to get push token for push notification!');
      return;
    }
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) {
      handleRegistrationError('Project ID not found');
    }
    try {
      const pushTokenString = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;

      return pushTokenString;
    } catch (e: unknown) {
      handleRegistrationError(`${e}`);
    }
  } else {
    handleRegistrationError('Must use physical device for push notifications');
  }
}

export const useBadgeNotifications = ({ availableCardsToSwipe }: { availableCardsToSwipe: number }) => {
  // use for push notifications, currently not used
  // const [expoPushToken, setExpoPushToken] = useState('');

  // useEffect(() => {
  //   registerForPushNotificationsAsync()
  //     .then(token => setExpoPushToken(token ?? ''))
  //     .catch((error: any) => setExpoPushToken(`${error}`));;
  // }, []);

  useEffect(() => {
    if (availableCardsToSwipe === 0) return;
    // sendPushNotification(expoPushToken, availableCardsToSwipe);
    scheduleDailyNotification(availableCardsToSwipe);
  }, [availableCardsToSwipe]);

  useEffect(() => {
    Notifications.setBadgeCountAsync(availableCardsToSwipe);
  }, [availableCardsToSwipe]);
}
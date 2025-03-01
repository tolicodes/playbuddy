import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Community, Event } from '../../commonTypes';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function schedulePushNotification(availableCardsToSwipe: Event[]) {
  const organizerEventCountMap = new Map();

  availableCardsToSwipe.forEach(event => {
    const organizer = event.organizer;
    if (organizer) {
      if (!organizerEventCountMap.has(organizer)) {
        organizerEventCountMap.set(organizer, 0);
      }
      organizerEventCountMap.set(organizer, organizerEventCountMap.get(organizer) + 1);
    }
  });

  const sortedOrganizers = Array.from(organizerEventCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => {
      const eventName = availableCardsToSwipe.find(event =>
        event.organizer?.name === entry[0].name)?.name
      return `${entry[0].name} - ${eventName}`.slice(0, 40) + '...';
    })

  const organizersString = sortedOrganizers.slice(0, 3).join('\n');

  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Check out these new events!`,
      body: organizersString,
    },
    trigger: {
      // // Sunday
      weekday: 1,

      hour: 12 + 6,
      minute: 0,
      repeats: true,

      // hour: new Date().getHours(),
      // minute: new Date().getMinutes() + 1,
    },
  });
}

export const useBadgeNotifications = ({ availableCardsToSwipe }: { availableCardsToSwipe: Event[] }) => {

  useEffect(() => {
    if (availableCardsToSwipe.length === 0) return;
    schedulePushNotification(availableCardsToSwipe);
    Notifications.setBadgeCountAsync(availableCardsToSwipe.length);
  }, [availableCardsToSwipe]);
}
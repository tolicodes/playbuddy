import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Community, Event } from '../../commonTypes';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const DEFAULT_BADGE_CHANNEL_ID = 'default';

const ensureBadgeNotificationChannel = async () => {
  if (Platform.OS !== 'android') return undefined;
  await Notifications.setNotificationChannelAsync(DEFAULT_BADGE_CHANNEL_ID, {
    name: 'Default',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  return DEFAULT_BADGE_CHANNEL_ID;
};

async function schedulePushNotification(availableCardsToSwipe: Event[]) {
  try {
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

    const channelId = await ensureBadgeNotificationChannel();
    const content = channelId
      ? { title: `Check out these new events!`, body: organizersString, channelId }
      : { title: `Check out these new events!`, body: organizersString };
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        // // Sunday
        weekday: 1,

        hour: 12 + 6,
        minute: 0,

        // hour: new Date().getHours(),
        // minute: new Date().getMinutes() + 1,
      },
    });
  } catch (error) {
    console.warn('schedulePushNotification: failed to schedule', error);
  }
}

export const useBadgeNotifications = ({ availableCardsToSwipe }: { availableCardsToSwipe: Event[] }) => {

  useEffect(() => {
    if (availableCardsToSwipe.length === 0) return;
    void schedulePushNotification(availableCardsToSwipe);
    void Notifications.setBadgeCountAsync(availableCardsToSwipe.length).catch(error =>
      console.warn('useBadgeNotifications: failed to set badge count', error)
    );
  }, [availableCardsToSwipe]);
}

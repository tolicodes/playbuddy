import { useEffect } from 'react';
import type { Event } from '../../commonTypes';
import { scheduleDiscoverGameNotifications } from '../notifications/discoverGameNotifications';

export const useBadgeNotifications = ({ availableCardsToSwipe }: { availableCardsToSwipe: Event[] }) => {
  useEffect(() => {
    void scheduleDiscoverGameNotifications({ availableCardsToSwipe });
  }, [availableCardsToSwipe]);
}

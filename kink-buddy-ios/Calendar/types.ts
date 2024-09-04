import { StackNavigationProp } from '@react-navigation/stack';
import { Event } from '../commonTypes'

export type CalendarStackParamList = {
    'Event List': undefined;
    'Event Details': { selectedEvent: Event, navigateBack?: () => void };
    Filters: undefined;
    Wishlist: undefined;
};


export type CalendarStack = StackNavigationProp<CalendarStackParamList>();
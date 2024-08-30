import { StackNavigationProp } from '@react-navigation/stack';
import { Event } from '../commonTypes'

export type CalendarStackParamList = {
    'Event List': undefined;
    'Event Details': { selectedEvent: Event };
    Filters: undefined;
};


export type CalendarStack = StackNavigationProp<CalendarStackParamList>();
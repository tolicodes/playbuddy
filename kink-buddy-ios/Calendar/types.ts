import { StackNavigationProp } from '@react-navigation/stack';
import { Event } from '../commonTypes'

export type NavStackParamList = {
    Home: undefined;
    'Event List': undefined;
    'Event Details': { selectedEvent: Event, origin: string };
    Filters: undefined;
    Wishlist: undefined;
    Login: undefined
};


export type NavStack = StackNavigationProp<NavStackParamList>;
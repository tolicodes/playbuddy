import AsyncStorage from '@react-native-async-storage/async-storage';

export type EventListViewMode = 'image' | 'classic';

export const EVENT_LIST_VIEW_MODE_KEY = 'event_list_view_mode_v1';
export const EVENT_LIST_VIEW_INTRO_KEY = 'event_list_view_intro_seen_v1';

export const parseEventListViewMode = (value?: string | null): EventListViewMode =>
    value === 'classic' ? 'classic' : 'image';

export const getEventListViewMode = async (): Promise<EventListViewMode> => {
    const raw = await AsyncStorage.getItem(EVENT_LIST_VIEW_MODE_KEY);
    return parseEventListViewMode(raw);
};

export const setEventListViewMode = async (mode: EventListViewMode): Promise<void> => {
    await AsyncStorage.setItem(EVENT_LIST_VIEW_MODE_KEY, mode);
};

export const getEventListIntroSeen = async (): Promise<boolean> => {
    const raw = await AsyncStorage.getItem(EVENT_LIST_VIEW_INTRO_KEY);
    return raw === 'true';
};

export const setEventListIntroSeen = async (seen: boolean): Promise<void> => {
    await AsyncStorage.setItem(EVENT_LIST_VIEW_INTRO_KEY, seen ? 'true' : 'false');
};

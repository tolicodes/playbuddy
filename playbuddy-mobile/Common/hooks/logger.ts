import * as amplitude from '@amplitude/analytics-react-native';
import RNUxcam from 'react-native-ux-cam';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { UserEventName, UserEventInput } from '../../../common/types/userEventTypes';

export function logEvent(
    name: UserEventName,
    props: unknown
) {
    try {
        amplitude.logEvent(name, props || {});
        RNUxcam.logEvent(name, props || {});
        logUserEventToDB({ user_event_name: name, user_event_props: props });
    } catch (error) {
        // this means it's in dev probably which doesn't support uxcam
    }
}

const logUserEventToDB = async ({ user_event_name, user_event_props }: { user_event_name: string, user_event_props?: any }) => {
    try {
        const { data } = await axios.post(`${API_BASE_URL}/user_events`, { user_event_name, user_event_props });
        return data;
    } catch (error) {
        console.error(`Error recording user event: ${error.message}`);
    }
}
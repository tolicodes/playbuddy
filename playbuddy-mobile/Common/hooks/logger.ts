import * as amplitude from '@amplitude/analytics-react-native';
import RNUxcam from 'react-native-ux-cam';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

export const logEvent = (event: string, data?: any) => {
    try {
        amplitude.logEvent(event, data);
        RNUxcam.logEvent(event, data);
        logUserEvent({ user_event_name: event, user_event_props: data });
    } catch (error) {
        // this means it's in dev probably which doesn't support uxcam
    }
}

const logUserEvent = async ({ user_event_name, user_event_props }: { user_event_name: string, user_event_props?: any }) => {
    try {
        const { data } = await axios.post(`${API_BASE_URL}/user_events`, { user_event_name, user_event_props });
        return data;
    } catch (error) {
        console.error(`Error recording user event: ${error.message}`);
    }
}
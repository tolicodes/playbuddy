import * as amplitude from '@amplitude/analytics-react-native';
import RNUxcam from 'react-native-ux-cam';

export const logEvent = (event: string, data?: any) => {
    try {
        amplitude.logEvent(event, data);
        RNUxcam.logEvent(event, data);
    } catch (error) {
        // this means it's in dev probably which doesn't support uxcam
    }
}
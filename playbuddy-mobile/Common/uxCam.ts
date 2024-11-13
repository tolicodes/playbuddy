import RNUxcam from 'react-native-ux-cam';


const configuration = {
    userAppKey: '8jtpjd8aeckt9y2',
    enableAutomaticScreenNameTagging: false,
    enableAdvancedGestureRecognition: true,  // default is true
    enableImprovedScreenCapture: true, // for improved screen capture on Android
}

try {
    RNUxcam.optIntoSchematicRecordings(); // Add this line to enable iOS screen recordings

    RNUxcam.optInOverall();
    RNUxcam.startWithConfiguration(configuration);
} catch (error) {
    // this means it's in dev probably which doesn't support uxcam
}

export const setUxCamUserIdentity = (email: string) => {
    try {
        RNUxcam.setUserIdentity(email)
    } catch (error) {
        // this means it's in dev probably which doesn't support uxcam
    }
}
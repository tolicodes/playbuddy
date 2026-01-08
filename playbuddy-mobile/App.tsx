import 'react-native-gesture-handler';
import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query';
import 'expo-dev-client';
import { useFonts } from 'expo-font';

import { UserProvider } from './Pages/Auth/hooks/UserContext';
import { CalendarProvider } from './Pages/Calendar/hooks/CalendarContext';
import Nav from './Common/Nav/Nav';
import * as Sentry from '@sentry/react-native';
import * as amplitude from '@amplitude/analytics-react-native';
import { CommonProvider } from './Common/hooks/CommonContext';
import { useFetchExpoUpdateAsync } from './Common/hooks/ExpoUpdate';
import { BuddiesProvider } from './Common/hooks/BuddiesContext';
import { queryClient } from './Common/hooks/reactQueryClient';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DeepLinkHandler from './Common/Nav/DeepLinkHandler';

amplitude.init('a68ac6bb7695dd7d955ddb8a0928eeed', undefined, {
  disableCookies: true,
});

Sentry.init({
  dsn: 'https://1fc36126dc6d94f30dc69cee2c5b46ea@o4507822914338816.ingest.us.sentry.io/4507822915387392',

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // enableSpotlight: __DEV__,
});


const App = () => {
  const [fontsLoaded] = useFonts({
    FontAwesome: require('react-native-vector-icons/Fonts/FontAwesome.ttf'),
    'FontAwesome5Free-Regular': require('react-native-vector-icons/Fonts/FontAwesome5_Regular.ttf'),
    'FontAwesome5Free-Solid': require('react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf'),
    'FontAwesome5Brands-Regular': require('react-native-vector-icons/Fonts/FontAwesome5_Brands.ttf'),
    Ionicons: require('react-native-vector-icons/Fonts/Ionicons.ttf'),
    'Material Icons': require('react-native-vector-icons/Fonts/MaterialIcons.ttf'),
  });

  useFetchExpoUpdateAsync();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <CommonProvider>
            <BuddiesProvider>
              <CalendarProvider>
                <PaperProvider>
                  <DeepLinkHandler />
                  <Nav />
                </PaperProvider>
              </CalendarProvider>
            </BuddiesProvider>
          </CommonProvider>
        </UserProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
};

export default App;

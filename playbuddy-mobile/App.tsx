import React, { useEffect } from 'react'
import 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import 'expo-dev-client';
import './Common/hooks/uxCam';

import { UserProvider } from './Pages/Auth/hooks/UserContext';
import { CalendarProvider } from './Pages/Calendar/hooks/CalendarContext';
import Nav from './Common/Nav/Nav';
import * as Sentry from '@sentry/react-native';
import * as amplitude from '@amplitude/analytics-react-native';
import { CommonProvider } from './Common/hooks/CommonContext';
import { onFetchUpdateAsync } from './Common/hooks/ExpoUpdate';
import { BuddiesProvider } from './Pages/Buddies/hooks/BuddiesContext';
import { queryClient } from './Common/hooks/reactQueryClient';
// import './Common/hooks/appsFlyer';

amplitude.init('a68ac6bb7695dd7d955ddb8a0928eeed');

Sentry.init({
  dsn: 'https://1fc36126dc6d94f30dc69cee2c5b46ea@o4507822914338816.ingest.us.sentry.io/4507822915387392',

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // enableSpotlight: __DEV__,
});


const App = () => {
  useEffect(() => {
    if (!__DEV__) {
      onFetchUpdateAsync();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <CommonProvider>
          <BuddiesProvider>
            <CalendarProvider>
              <Nav />
            </CalendarProvider>
          </BuddiesProvider>
        </CommonProvider>
      </UserProvider>
    </QueryClientProvider>
  );
};

export default App;

import React from 'react'
import 'react-native-gesture-handler';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from './Auth/UserContext';
import { CalendarProvider } from './Calendar/CalendarContext';
import Nav from './Nav';
import * as Sentry from '@sentry/react-native';
import * as amplitude from '@amplitude/analytics-react-native';
amplitude.init('a68ac6bb7695dd7d955ddb8a0928eeed');

Sentry.init({
  dsn: 'https://1fc36126dc6d94f30dc69cee2c5b46ea@o4507822914338816.ingest.us.sentry.io/4507822915387392',

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // enableSpotlight: __DEV__,
});

const queryClient = new QueryClient();


const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <CalendarProvider>
          <Nav />
        </CalendarProvider>
      </UserProvider>
    </QueryClientProvider>
  );
};

export default App;

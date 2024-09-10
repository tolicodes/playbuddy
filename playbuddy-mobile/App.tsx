import * as Updates from 'expo-updates';
import 'react-native-gesture-handler';
import { Button, Text } from 'react-native';

import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from './Auth/UserContext';
import { CalendarProvider } from './Calendar/CalendarContext';
import Nav from './Nav';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://1fc36126dc6d94f30dc69cee2c5b46ea@o4507822914338816.ingest.us.sentry.io/4507822915387392',

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // enableSpotlight: __DEV__,
});


const useCheckForAppUpdates = () => {
  async function checkForAppUpdates() {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        console.log('Update is available');
        await Updates.fetchUpdateAsync();
        // ... notify user of update ...
        Updates.reloadAsync();
      }
    } catch (e) {
      console.log(e);
    }
  }

  useEffect(() => {
    checkForAppUpdates();
  }, []);
}

const queryClient = new QueryClient();


const App = () => {
  useCheckForAppUpdates();

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

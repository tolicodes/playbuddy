import * as Updates from 'expo-updates';
import 'react-native-gesture-handler';

import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from './Auth/UserContext';
import CalendarProvider from './Calendar/CalendarContext';
import Nav from './Nav';


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
      <CalendarProvider>
        <UserProvider>
          <Nav />
        </UserProvider>
      </CalendarProvider>

    </QueryClientProvider>
  );
};

export default App;

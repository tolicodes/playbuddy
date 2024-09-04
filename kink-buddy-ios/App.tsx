import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import IonIcon from 'react-native-vector-icons/Ionicons';
import * as Updates from 'expo-updates';
import 'react-native-gesture-handler';

import Calendar from './Calendar/Calendar'
import { NavigationContainer } from '@react-navigation/native';
import Moar from './Pages/Moar';
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from './Auth/UserContext';
import Wishlist from './Calendar/Wishlist';
import CalendarProvider from './Calendar/CalendarContext';


type RootTabParamList = {
  Calendar: undefined;
  Kinks: undefined;
  Moar: undefined
  Wishlist: undefined
};

const Tab = createBottomTabNavigator<RootTabParamList>();

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
          <NavigationContainer>
            <Tab.Navigator
              screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size }) => {
                  if (route.name === 'Calendar') {
                    return <FAIcon name="calendar" size={size} color={color} />;
                  } else if (route.name === 'Kinks') {
                    return <MaterialIcon name="handcuffs" size={size} color={color} />;
                  } else if (route.name === "Moar") {
                    return <IonIcon name="ellipsis-horizontal" size={size} color={color} />;
                  } else if (route.name === 'Wishlist') {
                    return <FAIcon
                      name={'heart'} // Filled or outlined heart based on state
                      size={size}
                      color={color}
                    />
                  }
                },
                headerShown: false
              })}
            >
              <Tab.Screen name="Calendar" component={Calendar} />
              <Tab.Screen name="Wishlist" component={Wishlist}
                options={{ headerShown: true, headerTitle: 'Wishlist' }}

              />
              <Tab.Screen name="Moar" component={Moar} />
            </Tab.Navigator>
          </NavigationContainer>
        </UserProvider>
      </CalendarProvider>

    </QueryClientProvider>
  );
};

export default App;

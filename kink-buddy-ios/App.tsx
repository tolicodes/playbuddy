import { Alert, AppState, AppStateStatus, Linking } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import IonIcon from 'react-native-vector-icons/Ionicons';
import * as Updates from 'expo-updates';
import 'react-native-gesture-handler';
import { supabase } from './supabaseCiient';

import Calendar from './Calendar/Calendar'
import { NavigationContainer } from '@react-navigation/native';
import Moar from './Pages/Moar';
import { useEffect, useState } from 'react';
import Account from './Auth/Account';
import Auth from './Auth/Auth';

type RootTabParamList = {
  Calendar: undefined;
  Kinks: undefined;
  Resources: undefined
  Moar: undefined
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



const App = () => {
  useCheckForAppUpdates();

  return (
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
            }
          },
          headerShown: false
        })}
      >
        <Tab.Screen name="Calendar" component={Calendar} />
        {/* <Tab.Screen name="Kinks" component={DummyComponent}

          listeners={{
            tabPress: (e) => {
              e.preventDefault(); // Prevent the default action of navigating to the screen
              Linking.openURL('https://kinkbuddy.org/kinks'); // Open the external link
            },
          }}
        /> */}
        <Tab.Screen name="Moar" component={Moar} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default App;

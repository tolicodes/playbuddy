import { Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import IonIcon from 'react-native-vector-icons/Ionicons';
import * as Updates from 'expo-updates';
import 'react-native-gesture-handler';



import Web from './Pages/Web';
import Calendar from './Calendar/Calendar'
import { NavigationContainer } from '@react-navigation/native';
import Moar from './Pages/Moar';
import { useEffect } from 'react';

type RootTabParamList = {
  Calendar: undefined;
  Kinks: undefined;
  Resources: undefined
  Moar: undefined
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const App = () => {
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          Alert.alert(
            'Update available',
            'A new update is available and will be applied when you restart the app.',
            [
              { text: 'Restart Now', onPress: () => Updates.reloadAsync() },
              { text: 'Later', style: 'cancel' }
            ]
          );
        }
      } catch (error) {
        // console.error(error);
      }
    };

    checkForUpdates();
  }, []);

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
        <Tab.Screen name="Kinks" component={Web} />
        <Tab.Screen name="Moar" component={Moar} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default App;

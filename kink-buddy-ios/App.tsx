import { StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import IonIcon from 'react-native-vector-icons/Ionicons';
import * as Sentry from "@sentry/react-native";


import Web from './Web';
import Calendar from './Calendar/Calendar'
import { NavigationContainer } from '@react-navigation/native';
import Resources from './Resources'
import Moar from './Moar';

type RootTabParamList = {
  Calendar: undefined;
  Kinks: undefined;
  Resources: undefined
  Moar: undefined
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const App = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            if (route.name === 'Calendar') {
              return <FAIcon name="calendar" size={size} color={color} />;
            } else if (route.name === 'Kinks') {
              return <MaterialIcon name="handcuffs" size={size} color={color} />;
            } else if (route.name === 'Resources') {
              return <FAIcon name="book" size={size} color={color} />;
            } else if (route.name === "Moar") {
              return <IonIcon name="ellipsis-horizontal" size={size} color={color} />;
            }
          },
          headerShown: false
        })}
      >
        <Tab.Screen name="Calendar" component={Calendar} />
        <Tab.Screen name="Kinks" component={Web} />
        <Tab.Screen name="Resources" component={Resources} />
        <Tab.Screen name="Moar" component={Moar} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

Sentry.init({
  dsn: "https://1fc36126dc6d94f30dc69cee2c5b46ea@o4507822914338816.ingest.us.sentry.io/4507822915387392",
  // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
  // We recommend adjusting this value in production.
  tracesSampleRate: 1.0,
  _experiments: {
    // profilesSampleRate is relative to tracesSampleRate.
    // Here, we'll capture profiles for 100% of transactions.
    profilesSampleRate: 1.0,
  },
});

export default Sentry.wrap(App);

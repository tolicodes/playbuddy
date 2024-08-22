import { StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import IonIcon from 'react-native-vector-icons/Ionicons';


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

export default () => {
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
        })}
      // tabBarOptions={{
      //   activeTintColor: 'tomato',
      //   inactiveTintColor: 'gray',
      // }}
      >
        <Tab.Screen name="Calendar" component={Calendar} />
        <Tab.Screen name="Kinks" component={Web} />
        <Tab.Screen name="Resources" component={Resources} />
        <Tab.Screen name="Moar" component={Moar} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

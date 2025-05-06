import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import { useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { DrawerNav } from './DrawerNav';
import { tagScreenName } from '../hooks/uxCam';

/**
 * RootNavigator is the single entry-point for all in-app navigation.
 * It wraps the DrawerNav (global drawer + nested stacks & tabs)
 * with the NavigationContainer and a loading state while the
 * user profile is still being fetched.
 */
const RootNavigator = () => {
  const { isLoadingUserProfile } = useUserContext();

  if (isLoadingUserProfile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer
      onStateChange={(state) => {
        if (!state) return;
        const currentRoute = state.routes[state.index];
        if (currentRoute?.name) tagScreenName(currentRoute.name);
      }}
    >
      <DrawerNav />
    </NavigationContainer>
  );
};

export default RootNavigator;

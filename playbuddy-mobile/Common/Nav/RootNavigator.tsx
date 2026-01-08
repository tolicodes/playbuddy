import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import { useUserContext } from '../../Pages/Auth/hooks/UserContext';
import { DrawerNav } from './DrawerNav';

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
    >
      <DrawerNav />
    </NavigationContainer>
  );
};

export default RootNavigator;

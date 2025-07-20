import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import AddBuddy from './AddBuddy/AddBuddyScreen';
import SharedEvents from './SharedEventsScreen';
import MyBuddies from './MyBuddiesScreen';
import BuddyLists from './BuddyListsScreen';
import { LoginToAccess } from '../../../components/LoginToAccess';
import { useUserContext } from '../../Auth/hooks/UserContext';

const Tab = createMaterialTopTabNavigator();

const BuddiesTab = () => {
    const { authUserId } = useUserContext();

    if (!authUserId) {
        return <LoginToAccess entityToAccess="Buddies" />;
    }

    return (
        <>
            <Tab.Navigator>
                <Tab.Screen name="Add Buddy" component={AddBuddy} />
                <Tab.Screen name="Shared Events" component={SharedEvents} />
                <Tab.Screen name="My Buddies" component={MyBuddies} />
                <Tab.Screen name="Buddy Lists" component={BuddyLists} />
            </Tab.Navigator>
        </>
    );
};

export default BuddiesTab;

import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import AddBuddy from './AddBuddy/AddBuddyScreen';
import SharedEvents from './SharedEventsScreen';
import MyBuddies from './MyBuddiesScreen';
import BuddyLists from './BuddyListsScreen';

const Tab = createMaterialTopTabNavigator();

const BuddiesTab = () => {
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
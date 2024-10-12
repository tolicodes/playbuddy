import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import AddBuddy from './AddBuddy';
import SharedEvents from './SharedEvents';
import Buddies from './Buddies';
import BuddyLists from './BuddyLists';
import DemoBanner from '../Common/DemoBanner';

const Tab = createMaterialTopTabNavigator();

const BuddiesTab = () => {
    return (
        <>
            <DemoBanner />
            <Tab.Navigator>
                <Tab.Screen name="Add Buddy" component={AddBuddy} />
                <Tab.Screen name="Shared Events" component={SharedEvents} />
                <Tab.Screen name="My Buddies" component={Buddies} />
                <Tab.Screen name="Buddy Lists" component={BuddyLists} />
            </Tab.Navigator>
        </>
    );
};

export default BuddiesTab;

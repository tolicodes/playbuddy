import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import { CommunitiesJoinSection } from './CommunitiesJoinSection';
import { CommunitiesPlaySection } from './CommunitiesPlaySection';
import { CommunitiesManageSection } from './CommunitiesManageSection';

const Tab = createMaterialTopTabNavigator();

const CommunitiesNav = () => {

    return (
        <>
            <Tab.Navigator>
                <Tab.Screen name="Join" component={CommunitiesJoinSection} />
                <Tab.Screen name="Play" component={CommunitiesPlaySection} />
                <Tab.Screen name="Manage" component={CommunitiesManageSection} />
            </Tab.Navigator>
        </>
    );
};

export default CommunitiesNav;
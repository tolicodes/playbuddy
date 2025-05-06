import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import PromoCodeManagerScreen from './PromoCodesManager/PromoCodesManagerScreen';

const Tab = createMaterialTopTabNavigator();

const AdminNav = () => {
    return (
        <Tab.Navigator>
            <Tab.Screen
                name="Promo Codes"
                component={PromoCodeManagerScreen}
            />
        </Tab.Navigator>
    );
};

export default AdminNav;

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import { headerOptions } from '../Header/Header';
import { DiscoverPage } from '../../Pages/DiscoverPage';
import { DiscoverGame } from '../../Pages/DiscoverGame/DiscoverGame';
import SubmitEvent from '../../Pages/SubmitEvent';

const MoreStack = createStackNavigator();

export const MoreNavigator = () => {
    return (
        <MoreStack.Navigator>
            <MoreStack.Screen
                name="More Home"
                component={DiscoverPage}
                options={({ navigation }) => headerOptions({
                    navigation,
                    title: 'More',
                    isRootScreen: true,
                })}
            />
            <MoreStack.Screen
                name="Discover Game"
                component={DiscoverGame}
                options={({ navigation }) => headerOptions({
                    navigation,
                    title: 'Discover Game',
                })}
            />
            <MoreStack.Screen
                name="Submit Event"
                component={SubmitEvent}
                options={({ navigation }) => headerOptions({
                    navigation,
                    title: 'Add Your Event',
                })}
            />
        </MoreStack.Navigator>
    );
};

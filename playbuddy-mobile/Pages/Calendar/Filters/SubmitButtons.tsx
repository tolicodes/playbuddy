import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavStack } from '../../../Common/Nav/NavStackType';
import buttonStyles from './styles/buttonStyles';
import { logEvent } from '../../../Common/hooks/logger';

interface ButtonGroupProps {
    resetFilters: () => void;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({ resetFilters }) => {
    const navigation = useNavigation<NavStack>();

    return (
        <View style={buttonStyles.buttonContainer}>
            <TouchableOpacity onPress={() => {
                logEvent('filter_reset_button_clicked')
                resetFilters();
            }} style={buttonStyles.resetButton}>
                <Text style={buttonStyles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
                logEvent('filter_done_button_clicked')
                navigation.navigate('Calendar')
            }} style={buttonStyles.doneButton}>
                <Text style={buttonStyles.doneButtonText}>Done</Text>
            </TouchableOpacity>
        </View>
    );
};

export default ButtonGroup;

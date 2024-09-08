import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavStack } from './types';
import buttonStyles from './styles/buttonStyles';

interface ButtonGroupProps {
    resetFilters: () => void;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({ resetFilters }) => {
    const navigation = useNavigation<NavStack>();

    return (
        <View style={buttonStyles.buttonContainer}>
            <TouchableOpacity onPress={resetFilters} style={buttonStyles.resetButton}>
                <Text style={buttonStyles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Calendar')} style={buttonStyles.doneButton}>
                <Text style={buttonStyles.doneButtonText}>Done</Text>
            </TouchableOpacity>
        </View>
    );
};

export default ButtonGroup;

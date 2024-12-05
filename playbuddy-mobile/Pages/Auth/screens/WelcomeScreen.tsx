import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import HeaderLoginButton from '../Buttons/LoginButton';
import { logEvent } from '../../../Common/hooks/logger';
import CheckBox from '@rneui/themed/dist/CheckBox';
import FAIcon from 'react-native-vector-icons/FontAwesome5';


const features = [
    { id: '1', title: 'My Calendar', description: 'Add events to plan your week', icon: 'heart' },
    { id: '2', title: 'Buddies', description: 'Share your calendar & coordinate plans', icon: 'user-friends' },
    { id: '3', title: 'Communities', description: 'Join groups with private events', icon: 'users' },
    { id: '4', title: 'Swipe Mode', description: 'Swipe through events to plan your week', icon: 'layer-group' },
    { id: '5', title: 'Personalization', description: 'Set your home location and community', icon: 'map-marker-alt' }
];

export const WelcomeScreen = ({ onClickRegister, onClickSkip }: { onClickRegister: () => void, onClickSkip: () => void }) => {
    const doOnClickRegister = () => {
        logEvent('welcome_screen_register_clicked');
        onClickRegister();
    }

    const doOnClickSkip = () => {
        if (!isChecked) {
            Alert.alert('Please confirm that you understand that an account is required to see most content ');
            return;
        }

        onClickSkip();

        logEvent('welcome_screen_skipped');
    }

    const [isChecked, setIsChecked] = useState(false);

    return (
        <View style={styles.container}>
            <Text style={styles.welcomeTitle}>Welcome to PlayBuddy!</Text>

            <FlatList
                data={features}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.featureItem}>
                        <FAIcon name={item.icon as any} size={24} color="#007AFF" style={styles.featureIcon} />
                        <View style={styles.featureTextContainer}>
                            <Text style={styles.featureTitle}>{item.title}</Text>
                            <Text style={styles.featureDescription}>{item.description}</Text>
                        </View>
                    </View>
                )}
            />

            <Text style={styles.whyRegister}>
                To comply with local laws and app store guidelines, please create an account.
            </Text>

            <View style={styles.loginButtonContainer}>
                <HeaderLoginButton size={50} showLoginText={true} register={true} onPressButton={doOnClickRegister} />
            </View>

            <View style={styles.checkboxContainer}>
                <CheckBox
                    title="Skipping means fewer shown events (under 20%)."
                    checked={isChecked}
                    onPress={() => setIsChecked(!isChecked)}
                />
            </View>

            <TouchableOpacity style={styles.noThanksButton} onPress={doOnClickSkip}>
                <Text style={styles.noThanksText}>Skip for now</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    welcomeTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginBottom: 20
    },
    whyRegister: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20
    },
    highlightedText: {
        fontWeight: 'bold',
        color: '#007AFF'
    },
    loginButtonContainer: {
        marginTop: 10
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0'
    },
    featureIcon: {
        marginRight: 10,
        width: 30,
        textAlign: 'center'
    },
    featureTextContainer: {
        flex: 1
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333'
    },
    featureDescription: {
        fontSize: 14,
        color: '#666'
    },
    noThanksButton: {
        paddingVertical: 10,
        alignItems: 'center',
        color: '#666'
    },
    noThanksText: {
        fontSize: 16,
        color: '#333'
    },
    checkboxContainer: {
        padding: 20
    },
    skipText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center'
    }
});

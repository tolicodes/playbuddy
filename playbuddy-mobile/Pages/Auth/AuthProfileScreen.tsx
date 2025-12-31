import React from 'react';
import { Image } from 'expo-image';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, SafeAreaView } from 'react-native';
import { useUserContext } from './hooks/UserContext';
import { useNavigation } from '@react-navigation/native';
import { Avatar } from './Buttons/Avatar';
import { ScrollView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { NavStack } from '../../Common/Nav/NavStackType';
import { logEvent } from '../../Common/hooks/logger';
import { useAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { UE } from '../../userEventTypes';

export default function AccountDetails() {
    const { userProfile, signOut, fullNameFromOAuthedUser } = useUserContext();
    const { navigate } = useNavigation<NavStack>();
    const analyticsProps = useAnalyticsProps();


    const onPressSignOut = async () => {
        logEvent(UE.AuthProfilePressSignOut, analyticsProps);
        signOut();
        navigate('Home');
    }

    const onPressHome = () => {
        logEvent(UE.AuthProfilePressHome, analyticsProps);
        navigate('Calendar');
    }

    const onPressDeleteAccount = async () => {
        logEvent(UE.AuthProfilePressDeleteAccount, analyticsProps);
        Alert.alert(
            'Are you sure?',
            'This action will delete your account and all your wishlists. This cannot be undone.',
            [
                {
                    text: 'Delete',
                    onPress: () => {
                        signOut();
                        navigate('Calendar');
                    },
                    style: 'destructive',
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ]
        );
    };

    const onPressSupport = () => {
        logEvent(UE.AuthProfilePressSupport, analyticsProps);
        Linking.openURL('mailto:support@playbuddy.me');
    }

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#7B57E8', '#A757E8']} style={styles.gradient}>
                <ScrollView contentContainerStyle={styles.scrollViewContent}>
                    <View style={styles.sectionCard}>
                        {!userProfile?.avatar_url && (
                            <View style={styles.tipBanner}>
                                <Image
                                    source={{ uri: 'https://bsslnznasebtdktzxjqu.supabase.co/storage/v1/object/public/misc/question_person.png?t=2024-11-05T12%3A57%3A25.907Z' }}
                                    style={styles.tipIcon}
                                />
                                <Text style={styles.tipText}>Your avatar helps your buddies recognize you.</Text>
                            </View>
                        )}
                        <Avatar />
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Account</Text>
                        <InfoItem
                            label="Logged in as"
                            value={userProfile?.email || userProfile?.phone}
                        />
                        <InfoItem
                            label="Display Name"
                            value={userProfile?.name || fullNameFromOAuthedUser || ''}
                        />
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Actions</Text>
                        <TouchableOpacity style={styles.primaryButton} onPress={onPressHome}>
                            <View style={styles.iconTextContainer}>
                                <Icon name="home" size={20} color="#fff" />
                                <Text style={styles.primaryButtonText}>Go to Home</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.secondaryButton} onPress={onPressSignOut}>
                            <Text style={styles.secondaryButtonText}>Sign Out</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.dangerButton} onPress={onPressDeleteAccount}>
                            <Text style={styles.dangerButtonText}>Delete Account</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={onPressSupport} style={styles.supportLink}>
                        <Text style={styles.supportText}>support@playbuddy.me</Text>
                        <Text style={styles.supportSubText}>Support or feature ideas</Text>
                    </TouchableOpacity>
                </ScrollView>
            </LinearGradient>
        </SafeAreaView>
    );
}

const InfoItem = ({ label, value }: { label: string, value?: string }) => (
    <View style={styles.infoItem}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#7B57E8',
    },
    gradient: {
        flex: 1,
    },
    scrollViewContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 40,
    },
    sectionCard: {
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#4C2FA8',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    tipBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        backgroundColor: '#EFE9FF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#DED7FF',
        marginBottom: 12,
    },
    tipIcon: {
        width: 24,
        height: 24,
    },
    tipText: {
        flex: 1,
        fontSize: 14,
        color: '#4C2FA8',
        fontWeight: '600',
    },
    infoItem: {
        marginBottom: 14,
    },
    iconTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    label: {
        fontSize: 12,
        color: '#7E7A8D',
        marginBottom: 4,
    },
    value: {
        fontSize: 16,
        color: '#1F1A2B',
        fontWeight: '600',
    },
    primaryButton: {
        backgroundColor: '#6B4CE6',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    secondaryButton: {
        backgroundColor: '#F3F0FF',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#DDD5FF',
        marginBottom: 10,
    },
    secondaryButtonText: {
        color: '#5A43B5',
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
    },
    dangerButton: {
        backgroundColor: '#FFF1F2',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#FBC6CC',
    },
    dangerButtonText: {
        color: '#C0363C',
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
    },
    supportLink: {
        alignItems: 'center',
        paddingVertical: 6,
    },
    supportText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    supportSubText: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 12,
    },
});

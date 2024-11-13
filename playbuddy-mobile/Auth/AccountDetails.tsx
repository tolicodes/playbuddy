import React from 'react';
import { Image } from 'expo-image';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, Share, SafeAreaView } from 'react-native';
import { useUserContext } from '../contexts/UserContext';
import { useNavigation } from '@react-navigation/native';
import { Avatar } from './Avatar';
import { getSmallAvatarUrl } from '../Common/imageUtils';
import QRCodeStyled from 'react-native-qrcode-styled';
import { ScrollView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import { NavStack } from '../types';
import { useCommonContext } from '../Common/CommonContext';

export default function AccountDetails() {
    const { userProfile, signOut } = useUserContext();
    const { navigate } = useNavigation<NavStack>();

    const onPressSignOut = async () => {
        signOut(() => {
            navigate('Main Calendar');
        });
    }

    const onPressHome = () => {
        navigate('Main Calendar');
    }

    const onPressDeleteAccount = async () => {
        Alert.alert(
            'Are you sure?',
            'This action will delete your account and all your wishlists. This cannot be undone.',
            [
                {
                    text: 'Delete',
                    onPress: () => {
                        signOut(() => {
                            navigate('Main Calendar');
                        });
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
        Linking.openURL('mailto:toli@toli.me');
    }

    const avatarUrl = userProfile?.avatar_url && getSmallAvatarUrl(userProfile?.avatar_url, 300);
    const authUserId = userProfile?.auth_user_id;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                <View style={styles.centeredContent}>
                    <Text style={styles.headerText}>Account Details</Text>

                    {!userProfile?.avatar_url && (
                        <View style={styles.avatarInstructions}>
                            <Image source={{ uri: 'https://bsslnznasebtdktzxjqu.supabase.co/storage/v1/object/public/misc/question_person.png?t=2024-11-05T12%3A57%3A25.907Z' }} style={styles.avatarInstructionsImage} />
                            <Text style={styles.avatarInstructionsText}>Please take 30 seconds to upload an avatar to help your buddies identify you!</Text>
                        </View>
                    )}

                    <Avatar />

                    {userProfile?.avatar_url && (
                        <TouchableOpacity style={styles.button} onPress={onPressHome}>
                            <View style={styles.iconTextContainer}>
                                <Icon name="home" size={24} color="white" />
                                <Text style={styles.buttonText}>Go to Home</Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    {avatarUrl && (
                        <>
                            <View style={styles.infoContainer}>
                                <InfoItem label="Logged in as" value={userProfile?.email} />
                                <InfoItem label="Display Name" value={userProfile?.name} />

                                <Text style={styles.sectionHeader}>Wishlist Share Code</Text>
                                <Text style={styles.shareCodeInstruction}>
                                    To add you as a buddy, your friend can either enter your share code or scan your QR code:
                                </Text>

                                <View style={styles.qrCodeWrapper}>
                                    <QRCodeStyled data={authUserId} width={150} height={150} />
                                </View>

                                <Text style={styles.shareCodeInstruction}>Or enter your share code:</Text>

                                <View style={styles.shareCodeContainer}>
                                    <Text style={styles.shareCode}>{userProfile?.share_code}</Text>
                                    <TouchableOpacity
                                        style={styles.shareIconButton}
                                        onPress={() => {
                                            Share.share({
                                                message: `Add me as a buddy using the code ${userProfile?.share_code}`,
                                            });
                                        }}
                                    >
                                        <Icon name="share-outline" size={24} color="#007AFF" />
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={() => navigate('Add Buddy')}
                                >
                                    <Text style={styles.buttonText}>Add a Buddy</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    <TouchableOpacity style={[styles.button, styles.signOutButton]} onPress={onPressSignOut}>
                        <Text style={styles.buttonText}>Sign Out</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, styles.deleteAccountButton]} onPress={onPressDeleteAccount}>
                        <Text style={styles.buttonText}>Delete Account</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onPressSupport}>
                        <Text style={styles.getSupport}>Get support or suggest features: toli@toli.me</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
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
        backgroundColor: '#F2F2F7',
    },
    scrollViewContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    centeredContent: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 40,
    },
    headerText: {
        fontSize: 34,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#000',
        textAlign: 'center',
    },
    avatarInstructions: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 10,
        marginBottom: 20,
        alignItems: 'center',
    },

    avatarInstructionsText: {
        fontSize: 16,
        textAlign: 'center',
        color: 'white',
        fontWeight: 'bold',
    },
    avatarInstructionsImage: {
        width: 30,
        height: 30,
    },
    infoContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 20,
        marginBottom: 20,
        alignItems: 'center',
        width: '100%',
    },
    infoItem: {
        marginBottom: 16,
        alignItems: 'center',
    },
    iconTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionHeader: {
        fontSize: 20,
        fontWeight: '600',
        marginTop: 20,
        marginBottom: 10,
        color: '#000',
        textAlign: 'center',
    },
    label: {
        fontSize: 14,
        color: '#8E8E93',
        marginBottom: 4,
        textAlign: 'center',
    },
    value: {
        fontSize: 17,
        color: '#000',
        textAlign: 'center',
    },
    shareCodeInstruction: {
        fontSize: 14,
        color: '#8E8E93',
        textAlign: 'center',
        marginVertical: 10,
    },
    qrCodeWrapper: {
        alignItems: 'center',
        marginVertical: 20,
    },
    shareCodeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    shareCode: {
        fontSize: 24,
        fontWeight: '600',
        color: '#000',
        textAlign: 'center',
    },
    shareIconButton: {
        padding: 10,
        marginLeft: 10,
    },
    button: {
        backgroundColor: '#007AFF',
        borderRadius: 10,
        paddingVertical: 14,
        paddingHorizontal: 20,
        marginBottom: 16,
        width: '100%',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
        textAlign: 'center',
    },
    signOutButton: {
        backgroundColor: '#FF3B30',
    },
    deleteAccountButton: {
        backgroundColor: '#FF3B30',
    },
    getSupport: {
        color: '#007AFF',
        textAlign: 'center',
        fontSize: 14,
        marginTop: 20,
    },
});
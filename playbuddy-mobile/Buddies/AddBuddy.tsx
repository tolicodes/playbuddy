import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import QRCodeStyled from 'react-native-qrcode-styled';

import { useUserContext } from '../Auth/UserContext';
import CameraScanner from './CameraScanner';
import BuddyAddedConfirmation from './AddBuddyConfirmation';
import { LoginToAccess } from '../Common/LoginToAccess';
import { useBuddiesContext } from './BuddiesContext';
import { Button } from '@rneui/themed';

const AddBuddy: React.FC = () => {
    const { authUserId, userProfile } = useUserContext();
    const [barcode, setBarcode] = useState('');
    // auth_user_id of the buddy that has been added
    const [addedBuddyAuthUserId, setAddedBuddyAuthUserId] = useState('');
    const [addedBuddyShareCode, setAddedBuddyShareCode] = useState('');
    const { addBuddy, buddies } = useBuddiesContext();
    const [buddyShareCode, setBuddyShareCode] = useState('');
    const [scanning, setScanning] = useState(false);

    const addedBuddy = buddies.data?.find((buddy: any) => buddy.user_id === addedBuddyAuthUserId);

    useEffect(() => {
        if (barcode) {
            addBuddy.mutate({ buddyUserId: barcode });
            setAddedBuddyAuthUserId(barcode);
            setBarcode('');
        }
    }, [barcode]);

    useEffect(() => {
        if (addedBuddyShareCode) {
            addBuddy.mutate({ shareCode: addedBuddyShareCode });
            setAddedBuddyShareCode(buddyShareCode);
            setBuddyShareCode('');
        }
    }, [addedBuddyShareCode]);

    if (!authUserId) {
        return <LoginToAccess entityToAccess="buddies" />
    }

    return (
        <View style={styles.container}>
            <View style={styles.upperSection}>
                <Text style={styles.title}>
                    Have your buddy scan this code to add you as a buddy:
                </Text>
                <View style={styles.qrCodeWrapper}>
                    {<QRCodeStyled data={authUserId} width={100} height={100} style={{
                        width: 100,
                        height: 100
                    }} />}
                </View>

                <Text style={styles.shareCodeInstruction}>Or enter your share code:</Text>
                <Text style={styles.shareCode}>{userProfile?.share_code}</Text>
            </View>

            {/* Horizontal line */}
            <View style={styles.horizontalLine} />

            <View style={styles.lowerSection}>
                {!addedBuddyAuthUserId || !addedBuddy
                    ? (
                        <>
                            <Text style={styles.title}>
                                Scan your buddy's code:
                            </Text>

                            <CameraScanner
                                onBarcodeScanned={(barcode: string) => {
                                    setBarcode(barcode);
                                }}
                                scanning={scanning}
                                setScanning={setScanning}
                            />

                            {!scanning &&
                                <View style={styles.scanShareCodeContainer}>
                                    <Text style={styles.title}>Or enter their share code:</Text>
                                    <View style={styles.buddyShareCodeInputContainer}>
                                        <TextInput style={styles.buddyShareCodeInput} value={buddyShareCode} onChangeText={(text) => setBuddyShareCode(text)} />
                                        <Button title="Add Buddy" buttonStyle={styles.button} onPress={() => {
                                            addBuddy.mutate({ shareCode: buddyShareCode });
                                            setAddedBuddyShareCode(buddyShareCode);
                                            setBuddyShareCode('');

                                        }} />
                                    </View>
                                </View>
                            }
                        </>)
                    : <BuddyAddedConfirmation buddy={addedBuddy} onAddAnotherBuddy={() => {
                        setAddedBuddyAuthUserId('');
                    }} />
                }
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#F5F5F7', // Light background for iOS look
    },
    upperSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lowerSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1C1C1E', // Dark gray text for iOS aesthetic
        textAlign: 'center',
        marginBottom: 20,
    },
    qrCodeWrapper: {
        backgroundColor: '#FFFFFF',
        padding: 15,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20, // Subtle shadow for QR code
        elevation: 10,
        width: 130,
        height: 130
    },
    scanShareCodeContainer: {
        marginTop: 20,
    },
    shareCodeInstruction: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1C1C1E', // Dark gray text for iOS aesthetic
        textAlign: 'center',
        marginTop: 20,
    },

    shareCode: {
        fontSize: 25,
        fontWeight: '600',
        color: '#1C1C1E', // Dark gray text for iOS aesthetic
        textAlign: 'center',
    },
    horizontalLine: {
        width: '100%',
        height: 3,
        backgroundColor: '#E0E0E0', // Light gray line
        marginVertical: 10,
    },
    button: {
        backgroundColor: '#007AFF', // iOS blue
        paddingVertical: 15,
        borderRadius: 10,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6, // Button shadow for depth
    },
    buddyShareCodeInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    buddyShareCodeInput: {
        height: 55,
        width: 200,
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 5,
        padding: 10,
        marginTop: 10,
        // flex: 2,
        marginRight: 10,
        marginBottom: 10
    },
    camera: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    closeButton: {
        backgroundColor: '#FF3B30', // iOS red for "cancel" actions
        padding: 15,
        borderRadius: 10,
        marginBottom: 40,
        width: '90%',
        alignSelf: 'center',
    },
    closeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        textAlign: 'center',
    },
});

export default AddBuddy;

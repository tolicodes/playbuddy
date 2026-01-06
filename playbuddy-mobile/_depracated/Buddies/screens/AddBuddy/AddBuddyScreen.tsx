import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import QRCodeStyled from 'react-native-qrcode-styled';

import { useUserContext } from '../../../Auth/hooks/UserContext';
import CameraScanner from './CameraScanner';
import BuddyAddedConfirmation from './AddBuddyConfirmation';
import { LoginToAccess } from '../../../../components/LoginToAccess';
import { useBuddiesContext } from '../../../../Common/hooks/BuddiesContext';
import { logEvent } from '../../../../Common/hooks/logger';

const AddBuddy: React.FC = () => {
    const { authUserId, userProfile } = useUserContext();
    const { addBuddy, buddies } = useBuddiesContext();
    const [scanning, setScanning] = useState(false);
    const [shareCode, setShareCode] = useState('');
    const [addedBuddy, setAddedBuddy] = useState<any>(null);

    const handleAddBuddy = async (buddyId?: string, buddyShareCode?: string) => {
        try {
            await addBuddy.mutateAsync({ buddyUserId: buddyId, shareCode: buddyShareCode });
            const newBuddy = buddies.data?.find(
                (buddy) => buddy.user_id === buddyId || buddy.share_code === buddyShareCode
            );
            if (newBuddy) {
                setAddedBuddy(newBuddy);
            }
            logEvent(`add_buddy_${buddyId ? 'scan' : 'enter_code'}`);
        } catch (error) {
            alert('Failed to add buddy: ' + error);
            throw error;
        }
    };

    const renderAddBuddySection = () => (
        <>
            <Text style={styles.title}>Scan your buddy&apos;s code:</Text>
            <CameraScanner
                onBarcodeScanned={(barcode: string) => handleAddBuddy(barcode)}
                scanning={scanning}
                setScanning={setScanning}
            />
            {!scanning && (
                <View style={styles.scanShareCodeContainer}>
                    <Text style={styles.title}>Or enter their share code:</Text>
                    <View style={styles.buddyShareCodeInputContainer}>
                        <TextInput
                            style={styles.buddyShareCodeInput}
                            value={shareCode}
                            onChangeText={setShareCode}
                            placeholder="Enter share code"
                        />
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => handleAddBuddy(undefined, shareCode)}
                        >
                            <Text style={styles.buttonText}>Add Buddy</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </>
    );

    return (
        <ScrollView>
            <View style={styles.container}>
                <View style={styles.lowerSection}>
                    {!addedBuddy ? (
                        renderAddBuddySection()
                    ) : (
                        <BuddyAddedConfirmation
                            buddy={addedBuddy}
                            onAddAnotherBuddy={() => setAddedBuddy(null)}
                        />
                    )}
                </View>

                <View style={styles.horizontalLine} />

                <View style={styles.upperSection}>
                    <Text style={styles.title}>
                        Have your buddy scan this code to add you as a buddy:
                    </Text>
                    <View style={styles.qrCodeWrapper}>
                        <QRCodeStyled
                            data={authUserId}
                            width={100}
                            height={100}
                            style={{
                                width: 100,
                                height: 100,
                            }}
                        />
                    </View>
                    <Text style={styles.shareCodeInstruction}>Or enter your share code:</Text>
                    <Text style={styles.shareCode}>{userProfile?.share_code}</Text>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
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
        color: '#1C1C1E',
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
        shadowRadius: 20,
        elevation: 10,
        width: 130,
        height: 130,
    },
    scanShareCodeContainer: {
        marginTop: 20,
    },
    shareCodeInstruction: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1C1C1E',
        textAlign: 'center',
        marginTop: 20,
    },
    shareCode: {
        fontSize: 25,
        fontWeight: '600',
        color: '#1C1C1E',
        textAlign: 'center',
    },
    horizontalLine: {
        width: '100%',
        height: 3,
        backgroundColor: '#E0E0E0',
        marginVertical: 30,
    },
    button: {
        backgroundColor: '#007AFF',
        paddingVertical: 15,
        borderRadius: 10,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
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
        marginRight: 10,
        marginBottom: 10,
    },
});

export default AddBuddy;

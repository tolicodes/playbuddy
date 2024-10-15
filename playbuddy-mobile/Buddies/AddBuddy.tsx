import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCodeStyled from 'react-native-qrcode-styled';

import { useUserContext } from '../Auth/UserContext';
import CameraScanner from './CameraScanner';
import BuddyAddedConfirmation from './AddBuddyConfirmation';
import { LoginToAccess } from '../Common/LoginToAccess';
import { useBuddiesContext } from './BuddiesContext';

const AddBuddy: React.FC = () => {
    const { authUserId } = useUserContext();
    const [barcode, setBarcode] = useState('');
    const [addedBuddy, setAddedBuddy] = useState(false);
    const { addBuddy } = useBuddiesContext();

    useEffect(() => {
        console.log(barcode);
        if (barcode) {
            addBuddy({ buddyUserId: barcode });
            setAddedBuddy(true);
            setBarcode('');
        }
    }, [barcode]);

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
                    {<QRCodeStyled data={authUserId} width={200} height={200} style={{
                        width: 200,
                        height: 200
                    }} />}
                </View>
            </View>

            <View style={styles.lowerSection}>
                <Text style={styles.title}>
                    Scan your buddy's code to add them to your list
                </Text>


                {!addedBuddy
                    ? <CameraScanner onBarcodeScanned={(barcode: string) => {
                        setBarcode(barcode);
                        setAddedBuddy(true);
                    }} />
                    : <BuddyAddedConfirmation buddy={barcode} onAddAnotherBuddy={() => {
                        setAddedBuddy(false);
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
        marginBottom: 20,
    },
    lowerSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1C1C1E', // Dark gray text for iOS aesthetic
        textAlign: 'center',
        marginBottom: 20,
    },
    qrCodeWrapper: {
        backgroundColor: '#FFFFFF',
        padding: 30,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20, // Subtle shadow for QR code
        elevation: 10,
        width: 200,
        height: 200
    },
    scanButton: {
        backgroundColor: '#007AFF', // iOS blue
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 10,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6, // Button shadow for depth
    },
    scanButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
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

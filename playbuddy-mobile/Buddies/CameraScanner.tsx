// screens/CameraScreen.tsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';

export default function CameraScreen({ onBarcodeScanned }: { onBarcodeScanned: (barcode: string) => void }) {
    const [scanning, setScanning] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        setScanning(false);
        onBarcodeScanned(data);
    };

    if (!permission?.granted) {
        return (
            <TouchableOpacity style={styles.button} onPress={() => requestPermission()}>
                <Text style={styles.buttonText}>Grant Camera Permission</Text>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            {!scanning ? (
                <TouchableOpacity style={styles.button} onPress={() => setScanning(true)}>
                    <Text style={styles.buttonText}>Scan QR Code</Text>
                </TouchableOpacity>
            ) : (
                <CameraView
                    facing="back" style={styles.camera}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr"],
                    }}
                    onBarcodeScanned={handleBarCodeScanned}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 20,
        borderRadius: 10,
    },
    buttonText: {
        fontSize: 18,
        color: '#fff',
        textAlign: 'center',
    },
    camera: {
        width: 200,
        height: 200
    },
    text: {
        fontSize: 16,
        marginBottom: 20,
    },
});

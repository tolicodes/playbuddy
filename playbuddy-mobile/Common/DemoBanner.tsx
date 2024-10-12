import React from 'react';
import { Text } from 'react-native';

export default function DemoBanner() {
    return (
        <Text
            style={{ fontSize: 20, textAlign: 'center', fontWeight: 'bold', color: 'red', marginBottom: 20, marginTop: 10 }}
        >THIS IS A DEMO (Fake Data Used)</Text>
    )
}
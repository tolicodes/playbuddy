import React, { useState } from 'react';
import { Portal, Dialog, Button, TextInput } from 'react-native-paper';

export default function PromoCodeModal({
    visible,
    organizerId,
    onClose,
    onSave,
}: {
    visible: boolean;
    organizerId: number | null;
    onClose: () => void;
    onSave: (newPromo: any) => void;
}) {
    const [campaign, setCampaign] = useState('');
    const [code, setCode] = useState('');

    const handleSave = async () => {
        const res = await fetch('/api/promo_codes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ organizer_id: organizerId, campaign, code }),
        });
        const newPromo = await res.json();
        onSave(newPromo);
    };

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={onClose}>
                <Dialog.Title>New Promo Code</Dialog.Title>
                <Dialog.Content>
                    <TextInput
                        label="Campaign"
                        value={campaign}
                        onChangeText={setCampaign}
                    />
                    <TextInput
                        label="Code"
                        value={code}
                        onChangeText={setCode}
                    />
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={onClose}>Cancel</Button>
                    <Button onPress={handleSave}>Save</Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
}

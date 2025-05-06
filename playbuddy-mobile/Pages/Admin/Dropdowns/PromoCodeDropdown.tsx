import React, { useState } from 'react';
import { PromoCode } from '../types';
import { Menu, Button } from 'react-native-paper';
import { View } from 'react-native';

export default function PromoCodeDropdown({
    value,
    options,
    onChange,
}: {
    value: number;
    options: PromoCode[];
    onChange: (id: number | 'new') => void;
}) {
    const [visible, setVisible] = useState(false);
    const selected = options.find(p => p.id === value);
    const formatLabel = (p: PromoCode) => `${p.campaign} - ${p.code}`;

    return (
        <View style={{ marginVertical: 8 }}>
            <Menu
                visible={visible}
                onDismiss={() => setVisible(false)}
                anchor={
                    <Button mode="outlined" onPress={() => setVisible(true)}>
                        {selected ? formatLabel(selected) : 'Select Promo Code'}
                    </Button>
                }>
                {options.map(opt => (
                    <Menu.Item
                        key={opt.id}
                        onPress={() => {
                            onChange(opt.id);
                            setVisible(false);
                        }}
                        title={formatLabel(opt)}
                    />
                ))}
                <Menu.Item
                    onPress={() => {
                        onChange('new');
                        setVisible(false);
                    }}
                    title="Create New Promo Code"
                />
            </Menu>
        </View>
    );
}

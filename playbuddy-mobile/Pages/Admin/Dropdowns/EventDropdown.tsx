import React, { useState } from 'react';
import { Event } from '../types';
import { Menu, Button } from 'react-native-paper';
import { View } from 'react-native';

export default function EventDropdown({
    value,
    options,
    onChange,
}: {
    value: number;
    options: Event[];
    onChange: (id: number) => void;
}) {
    const [visible, setVisible] = useState(false);
    const selected = options.find(e => e.id === value);

    return (
        <View style={{ marginVertical: 8 }}>
            <Menu
                visible={visible}
                onDismiss={() => setVisible(false)}
                anchor={
                    <Button mode="outlined" onPress={() => setVisible(true)}>
                        {selected?.name || 'Select Event'}
                    </Button>
                }>
                {options.map(opt => (
                    <Menu.Item
                        key={opt.id}
                        onPress={() => {
                            onChange(opt.id);
                            setVisible(false);
                        }}
                        title={opt.name}
                    />
                ))}
            </Menu>
        </View>
    );
}

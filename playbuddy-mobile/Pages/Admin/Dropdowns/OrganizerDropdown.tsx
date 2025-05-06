import React, { useState } from 'react';
import { View } from 'react-native';
import { Menu, Button } from 'react-native-paper';
import { Organizer } from '../../../commonTypes';

export default function OrganizerDropdown({
    value,
    options,
    onChange,
}: {
    value: number;
    options: Organizer[];
    onChange: (id: number) => void;
}) {
    const [visible, setVisible] = useState(false);
    const selected = options.find((o) => o.id === value);

    return (
        <View style={{ marginVertical: 8 }}>
            <Menu
                visible={visible}
                onDismiss={() => setVisible(false)}
                anchor={
                    <Button mode="outlined" onPress={() => setVisible(true)}>
                        {selected?.name || 'Select Organizer'}
                    </Button>
                }
            >
                {options.map((opt) => (
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

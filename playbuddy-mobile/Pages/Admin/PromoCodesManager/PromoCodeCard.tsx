import React from 'react';
import { Card, TextInput, Button } from 'react-native-paper';
import { PromoCode } from '../../../commonTypes';
import OrganizerDropdown from '../Dropdowns/OrganizerDropdown';

export default function PromoCodeCard({
    promoCode,
    organizers,
    onChange,
    onDelete,
}: {
    promoCode: PromoCode;
    organizers: any[];  // or specify Organizer[] if available
    onChange: (updated: PromoCode) => void;
    onDelete: () => void;
}) {
    return (
        <Card style={{ margin: 8 }}>
            <Card.Title title="Promo Code" />
            <Card.Content>
                <OrganizerDropdown
                    value={promoCode.organizer_id}
                    options={organizers}
                    onChange={(id: number) => onChange({ ...promoCode, organizer_id: id })}
                />
                <TextInput
                    label="Campaign"
                    value={promoCode.campaign}
                    onChangeText={(text: string) => onChange({ ...promoCode, campaign: text })}
                />
                <TextInput
                    label="Code"
                    value={promoCode.code}
                    onChangeText={(text: string) => onChange({ ...promoCode, code: text })}
                />
            </Card.Content>
            <Card.Actions>
                <Button onPress={onDelete} textColor="red">
                    Delete
                </Button>
            </Card.Actions>
        </Card>
    );
}

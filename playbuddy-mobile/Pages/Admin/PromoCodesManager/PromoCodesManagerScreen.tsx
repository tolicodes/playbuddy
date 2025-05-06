import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { FAB, Text } from 'react-native-paper';
import DeepLinkCard from './DeepLinkCard';
import PromoCodeCard from './PromoCodeCard';
import PromoCodeModal from './PromoCodeModal';
import { Organizer, Event, PromoCode, DeepLink } from '../../../commonTypes';
import { useFetchOrganizers } from '../../../Common/hooks/useOrganizers';
import { useFetchEvents } from '../../Calendar/hooks/useEvents';
import { useAddDeepLink, useFetchDeepLinks } from '../../../Common/hooks/useDeepLinks';
import { useAddPromoCode, useFetchPromoCodes } from '../../../Common/hooks/usePromoCodes';

export default function PromoCodeManagerScreen() {
    // States for the modal and additional input fields
    const [modalVisible, setModalVisible] = useState(false);

    // For creating/updating a deep link, use full objects (instead of IDs only)
    const [selectedOrganizer, setSelectedOrganizer] = useState<Organizer | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [selectedFeaturedPromoCode, setSelectedFeaturedPromoCode] = useState<PromoCode | null>(null);

    // Deep link specific input state variables
    const [campaign, setCampaign] = useState('');
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [type, setType] = useState('');

    // Promo code specific input state variables
    const [promoCodeValue, setPromoCodeValue] = useState('');
    const [discount, setDiscount] = useState<number>(0);
    const [discountType, setDiscountType] = useState(''); // e.g., 'percentage' or 'fixed'
    const [scope, setScope] = useState('');
    const [productType, setProductType] = useState('');

    // Fetch data hooks
    const { data: organizers, isLoading: organizersLoading } = useFetchOrganizers();
    const { events, isLoading: eventsLoading } = useFetchEvents();
    const { data: promoCodes, isLoading: promoCodesLoading } = useFetchPromoCodes();
    const { data: deepLinks, isLoading: deepLinksLoading } = useFetchDeepLinks();

    console.log(deepLinks);

    const { mutate: addDeepLink } = useAddDeepLink();
    const { mutate: addPromoCode } = useAddPromoCode();

    const handleAddDeepLink = () => {
        // Ensure that the necessary state values are selected
        if (!selectedOrganizer || !selectedEvent || !selectedFeaturedPromoCode) {
            console.error('Organizer, event, and featured promo code must be selected.');
            return;
        }

        addDeepLink({
            organizer: selectedOrganizer,
            featured_event: selectedEvent,
            featured_promo_code: selectedFeaturedPromoCode,
            promo_codes: [], // You can implement logic here to add additional promo codes if needed

            campaign, // Campaign name
            name,     // Deep link name
            slug,     // Unique slug for the deep link
            type,     // Type of deep link
        });
    };

    const handleAddPromoCode = () => {
        if (!selectedOrganizer) {
            console.error('Organizer must be selected for a promo code.');
            return;
        }

        addPromoCode({
            organizer_id: selectedOrganizer.id,
            promo_code: promoCodeValue,
            discount,
            discount_type: discountType,
            scope,
            product_type: productType,
        });
    };

    return (
        <ScrollView>
            <Text variant="titleLarge" style={{ margin: 16 }}>Deep Links</Text>
            {!deepLinksLoading && deepLinks && deepLinks.map((dl: DeepLink) => (
                <DeepLinkCard
                    key={dl.id}
                    deepLink={dl}
                    organizers={organizers || []}
                    events={events || []}
                    promoCodes={promoCodes || []}
                    onChange={(updated: DeepLink) => {
                        // Update the deep link in your state or refetch data
                    }}
                    onDelete={() => {
                        // Delete logic here
                    }}
                    onCreatePromoCode={(org: Organizer) => {
                        // Set the organizer for which a promo code is created and open the modal
                        setSelectedOrganizer(org);
                        setModalVisible(true);
                    }}
                />
            ))}

            <Text variant="titleLarge" style={{ margin: 16 }}>Promo Codes</Text>
            {!promoCodesLoading && promoCodes && promoCodes.map((promo: PromoCode) => (
                <PromoCodeCard
                    key={promo.id}
                    promoCode={promo}
                    organizers={organizers || []}
                    onChange={(updated: PromoCode) => {
                        // Update logic for promo code here
                    }}
                    onDelete={() => {
                        // Delete logic for promo code here
                    }}
                />
            ))}

            <FAB
                icon="plus"
                label="Add Deep Link"
                onPress={handleAddDeepLink}
                style={{ margin: 16 }}
            />
            <FAB
                icon="plus"
                label="Add Promo Code"
                onPress={handleAddPromoCode}
                style={{ margin: 16 }}
            />

            <PromoCodeModal
                visible={modalVisible}
                organizerId={selectedOrganizer ? selectedOrganizer.id : null}
                onClose={() => setModalVisible(false)}
                onSave={(newPromo: any) => {
                    // Optionally update your local state or refresh promo codes here
                    setModalVisible(false);
                }}
            />
        </ScrollView>
    );
}

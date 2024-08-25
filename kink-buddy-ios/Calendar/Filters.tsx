import { useState } from 'react';
import { MultiSelect } from 'react-native-element-dropdown';

export const Filters = ({ organizers }) => {
    const [selectedOrganizers, setSelectedOrganizers] = useState<string[]>([]);
    return <MultiSelect
        data={organizers}
        value={selectedOrganizers}
        search={true}
        searchField="label"
        labelField={'label'}
        valueField={'value'}
        onChange={(items) => setSelectedOrganizers(items)}
        placeholder="Select an organizer"
    />;
}
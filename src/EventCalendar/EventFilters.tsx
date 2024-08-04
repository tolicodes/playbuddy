import { useState } from "react";
import { OrganizerMeta } from "./calendarUtils";

type EventFiltersProps = {
    onFilterOrganizers: (organizers: OrganizerMeta[]) => void;
    organizers: OrganizerMeta[]
};

export const EventFilters = ({ onFilterOrganizers, organizers }: EventFiltersProps) => {
    const [filteredOrganizers, setFilteredOrganizers] = useState<OrganizerMeta[]>(organizers);

    const handleChangeFilter = (organizer: OrganizerMeta) => {
        let newFilteredOrganizers;

        // if the organizer is not in the list, add it
        // otherwise, remove it
        if (!filteredOrganizers.includes(organizer)) {
            newFilteredOrganizers = [...filteredOrganizers, organizer];
        } else {
            newFilteredOrganizers = filteredOrganizers.filter((org) => org !== organizer);
        }
        setFilteredOrganizers(newFilteredOrganizers);
        onFilterOrganizers(newFilteredOrganizers);
    };

    return (
        <div>
            {organizers
                .sort((a, b) => b.count - a.count)
                .map((organizer) => (
                    <label key={organizer.name} style={{ backgroundColor: organizer.color, marginRight: '10px' }}>
                        <input
                            type="checkbox"
                            value={organizer.name}
                            checked={filteredOrganizers.includes(organizer)}
                            onChange={() => handleChangeFilter(organizer)}
                        />
                        {organizer.name} ({organizer.count})
                    </label>
                ))}
        </div>
    );
};
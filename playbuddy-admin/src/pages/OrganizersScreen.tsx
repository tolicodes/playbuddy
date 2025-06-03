// src/pages/OrganizersScreen.tsx

import React, { useState, ChangeEvent } from "react";
import { useOrganizers, Organizer } from "../lib/useOrganizers";

export default function OrganizersScreen() {
    const { data, isLoading, error } = useOrganizers();

    // State to track hidden organizers
    const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
    // State for search input
    const [searchTerm, setSearchTerm] = useState<string>("");

    const toggleHidden = (id: number) => {
        setHiddenIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full py-8">
                Loading…
            </div>
        );
    }

    if (error) {
        return (
            <p className="text-center text-red-500 py-8">
                Error: {error.message}
            </p>
        );
    }

    // Filter organizers by search term (case-insensitive)
    const filtered = data!.filter(org =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-screen bg-gray-50 flex flex-col">
            {/* Fixed header with title and search */}
            <div className="sticky top-0 bg-white z-10 border-b">
                <div className="p-4">
                    <h1 className="text-2xl font-semibold mb-2">Organizers</h1>
                    <input
                        type="text"
                        placeholder="Search organizers..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                    <p className="text-center text-gray-500 mt-8">No organizers found.</p>
                ) : (
                    <ul>
                        {filtered.map((org: Organizer) => {
                            const isHidden = hiddenIds.has(org.id);
                            return (
                                <li
                                    key={org.id}
                                    className="flex justify-between items-center px-4 py-3 border-b bg-white"
                                >
                                    <span
                                        className={`flex-1 ${isHidden ? "text-gray-400 italic" : "text-gray-800"
                                            }`}
                                    >
                                        {isHidden ? "(Hidden)" : org.name}
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={isHidden}
                                        onChange={() => toggleHidden(org.id)}
                                        className="h-5 w-5 text-purple-600 border-gray-300 rounded"
                                    />
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}

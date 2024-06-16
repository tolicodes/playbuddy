// KinkAdminTable.stories.jsx
import React from 'react';
import { Meta, StoryObj } from '@storybook/react';

import KinkAdminTable from './KinkAdminTable';
// import { Kink } from '../KinkLibrary/types';

// Here we are defining metadata for our story
const meta = {
    title: 'Components/KinkAdminTable',
    component: KinkAdminTable,
    tags: ['autodocs'],
};

export default meta;


type Story = StoryObj<typeof meta>;


// Define some mock row data
const mockRowData = [
    {
        idea_title: "Example Kink",
        idea_description: "Description of the example kink.",
        categories: ["Category1", "Category2"],
        favorite: true,
        status: "done",
        level: "easy",
        is_group: false,
        needs_supplies: "None",
    },
    // Add more mock kinks as needed
];

export const Primary: Story = {
    // args: {
    //     rowData: mockRowData, 
    // }
}


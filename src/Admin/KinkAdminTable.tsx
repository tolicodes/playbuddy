import React, { useEffect, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css'; // Core grid CSS
import 'ag-grid-community/styles/ag-theme-alpine.css'; // Theme
import { supabase } from './supabaseClient';
import { Kink } from '../KinkLibrary/types';

// Define your column definitions with the appropriate field types
const columnDefs = [
  { field: 'idea_title', headerName: 'Title' },
  { field: 'idea_description', headerName: 'Description' },
  { field: 'categories', headerName: 'Categories', cellRenderer: (params: any) => params.join(', ') },
  { field: 'favorite', headerName: 'Favorite'}, // Example of custom cell renderer
  { field: 'status', headerName: 'Status' },
  { field: 'level', headerName: 'Level' },
  { field: 'is_group', headerName: 'Group Activity'},
  { field: 'needs_supplies', headerName: 'Needs Supplies' },
];

const KinkAdminTable: React.FC = () => {
    const [rowData, setRowData] = useState<Kink[]>([]);

    useEffect(() => {
        const fetchKinks = async () => {
            const { data: kinks, error } = await supabase
                .from('kinks')
                .select('*');
            
            if (error) console.error("Error fetching kinks:", error);
            else setRowData(kinks ? kinks : []);
        };

        fetchKinks();
    }, []);

    return (
        <div className="ag-theme-alpine" style={{ height: 600, width: '100%' }}>
            <AgGridReact
                // @ts-ignore
                columnDefs={columnDefs}
                rowData={rowData}
                domLayout='autoHeight' // Adjust grid size automatically
            />
        </div>
    );
};

export default KinkAdminTable;

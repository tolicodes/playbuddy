import React, { useCallback, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css'; // Core grid CSS
import 'ag-grid-community/styles/ag-theme-alpine.css'; // Theme
import { Kink, Level, Status } from '../Common/types';
import MultiSelectEditor from './MultiSelectEditor';
import { EventClassifications, getClassificationDetails } from '../../../playbuddy-api/src/scripts/event-classifier/event_classifications';


const multiSelectProps = {
    cellRenderer: (params: any) => params.value && params.value.join(', '),
    editable: true,
    cellEditor: MultiSelectEditor,
    cellEditorPopup: true,
    cellEditorParams: {
        values: [], // Replace with actual categories
    },
};

// Define your column definitions with the appropriate field types
const columnDefs = [
    { field: 'original_id', headerName: 'Original Id', editable: false },

    {
        field: 'name', headerName: 'Name', editable: false,
        cellEditor: 'agLargeTextCellEditor',
        cellEditorPopup: true,
        cellEditorParams: {
            maxLength: 10000,
        },
    },
    {
        field: 'organizer_name',
        headerName: 'Organizer Name',
        editable: false,

    },
    {
        field: 'tags',
        headerName: 'Event Themes',
        ...multiSelectProps,
    },
    {
        field: 'tags',
        headerName: 'Tags',
        ...multiSelectProps,
    },
    {
        field: 'comfort_level',
        headerName: 'Comfort Level',
        ...multiSelectProps,
    },
    {
        field: 'experience_level',
        headerName: 'Experience Level',
        ...multiSelectProps,
    },

    {
        field: 'inclusivity',
        headerName: 'Inclusivity',
        ...multiSelectProps,
    },

    {
        field: 'interactivity_level',
        headerName: 'Interactivity Level',
        ...multiSelectProps,
    },
];

const DEFAULT_ROW_DATA: Partial<EventClassifications> = {
    tags: [],

    tags: [],

    comfort_level: '',
    experience_level: '',
    inclusivity: '',
    interactivity_level: '',
};


const buildColumnDefs = () => {
    return columnDefs.map((columnDef) => {
        const classification = getClassificationDetails(columnDef.field)
        if (!classification) return columnDef;

        return {
            ...columnDef,
            cellEditorParams: {
                values: classification.options,
            },
        };
    }
    );
};

const EventAdminTable: React.FC = () => {
    const [rowData, setRowData] = useState<Kink[]>([]);

    const [pinnedTopRowData, setPinnedTopRowData] = useState<any[]>([
        DEFAULT_ROW_DATA
    ]);

    const onCellValueChanged = useCallback(
        (params: any) => {
            if (params.node.rowPinned) {
                const updatedPinnedRowData = [...pinnedTopRowData];
                updatedPinnedRowData[0][params.colDef.field] = params.newValue;
                setPinnedTopRowData(updatedPinnedRowData);
            } else {
                const updatedData: Partial<Kink> = {
                    [params.colDef.field]: params.newValue,
                };
                // updateKink(params.data.id, updatedData);
            }
        },
        [pinnedTopRowData],
    );

    const onAddRow = async () => {
        const newRow = { ...pinnedTopRowData[0] };
        setRowData([...rowData, newRow]);

        // const insertedData = await addKinkData(newRow);

        // if (insertedData) {
        //     setRowData([...rowData, insertedData]);
        //     setPinnedTopRowData([
        //         DEFAULT_ROW_DATA
        //     ]);
        // }
    };

    return (
        <div
            className="ag-theme-alpine"
            style={{ height: 600, width: '100%' }}
        >
            <button onClick={onAddRow}>Add Row</button>

            <AgGridReact
                // @ts-ignore
                columnDefs={buildColumnDefs()}
                rowData={rowData}
                domLayout="autoHeight" // Adjust grid size automatically
                frameworkComponents={{
                    multiSelectEditor: MultiSelectEditor,
                }}
                onCellValueChanged={onCellValueChanged}
                pinnedTopRowData={pinnedTopRowData}
            />
        </div>
    );
};

export default EventAdminTable;

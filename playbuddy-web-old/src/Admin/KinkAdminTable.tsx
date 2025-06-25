import React, { useCallback, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css'; // Core grid CSS
import 'ag-grid-community/styles/ag-theme-alpine.css'; // Theme
import { Kink, Level, Status } from '../Common/types';
import MultiSelectEditor from './MultiSelectEditor';
import { updateKink } from './utils/updateKink';
import { addKinkData } from './utils/insertKink';
import { getCategoryStrings } from '../KinkLibrary/utils/getCategoriesWithCounts';

// Define your column definitions with the appropriate field types
const columnDefs = [
  { field: 'idea_title', headerName: 'Title', editable: true },
  {
    field: 'idea_description',
    headerName: 'Description',
    editable: true,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorPopup: true,
    cellEditorParams: {
      maxLength: 10000,
    },
  },
  {
    field: 'categories',
    headerName: 'Categories',
    cellRenderer: (params: any) => params.value && params.value.join(', '),
    editable: true,
    cellEditor: MultiSelectEditor,
    cellEditorPopup: true,
    cellEditorParams: {
      values: [], // Replace with actual categories
    },
  },
  {
    headerName: 'Recommended',
    field: 'recommended',
    editable: true,
    cellEditor: 'agCheckboxCellEditor',
    cellRenderer: 'agCheckboxCellRenderer',
  },
  {
    headerName: 'Status',
    field: 'status',
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: {
      values: Object.values(Status),
    },
  },
  {
    headerName: 'Level',
    field: 'level',
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: {
      values: Object.values(Level),
    },
  },
  {
    headerName: 'Is Group',
    field: 'is_group',
    editable: true,
    cellEditor: 'agCheckboxCellEditor',
    cellRenderer: 'agCheckboxCellRenderer',
  },
  {
    headerName: 'Needs Supplies',
    field: 'needs_supplies',
    editable: true,
    cellRenderer: 'agCheckboxCellRenderer',
  },
];

const DEFAULT_ROW_DATA: Partial<Kink> = {
  idea_title: '',
  idea_description: '',
  categories: [],
  recommended: false,
  status: Status.Todo,
  level: Level.Easy,
  is_group: false,
  needs_supplies: '',
};

const buildColumnDefs = (categories: string[]) => {
  return columnDefs.map((columnDef) =>
    columnDef.field === 'categories'
      ? {
        ...columnDef,
        cellEditorParams: {
          options: categories.map((category) => ({
            label: category,
            value: category,
          })),
        },
      }
      : columnDef,
  );
};



const KinkAdminTable: React.FC = () => {
  const [rowData, setRowData] = useState<Kink[]>([]);
  const categoryStrings = useMemo(() => getCategoryStrings(rowData), [rowData]);

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
        updateKink(params.data.id, updatedData);
      }
    },
    [pinnedTopRowData],
  );

  const onAddRow = async () => {
    const newRow = { ...pinnedTopRowData[0] };
    setRowData([...rowData, newRow]);

    const insertedData = await addKinkData(newRow);

    if (insertedData) {
      setRowData([...rowData, insertedData]);
      setPinnedTopRowData([
        DEFAULT_ROW_DATA
      ]);
    }
  };

  return (
    <div
      className="ag-theme-alpine"
      style={{ height: 600, width: '100%' }}
    >
      <button onClick={onAddRow}>Add Row</button>

      <AgGridReact
        // @ts-ignore
        columnDefs={buildColumnDefs(categoryStrings)}
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

export default KinkAdminTable;

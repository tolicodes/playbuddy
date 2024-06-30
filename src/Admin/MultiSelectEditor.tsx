import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';

interface Option  {
  value: string;
  label: string;
}

interface MultiSelectEditorProps {
  value?: string[];
  api?: any;
  node?: any;
  colDef?: any;
  options: Option[];
}

const MultiSelectEditor: React.FC<MultiSelectEditorProps> = (props) => {
  const initialSelectedOptions = props.value?.map(val => ({ value: val, label: val })) || [];

  const [selectedOptions, setSelectedOptions] = useState<Option[]>(initialSelectedOptions);

  const ref = useRef<any>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
    }
  }, []);

  const handleChange = (selected: Option[] | null) => {
    setSelectedOptions(selected || []);
  };

  const handleBlur = () => {
    const newValue = selectedOptions.map(option => option.value);
    props.api.stopEditing(false);
    props.node.setDataValue(props.colDef.field, newValue);

  };

  return (
    <Select
      ref={ref}
      value={selectedOptions}
      onChange={(selected) => handleChange(selected as Option[])}
      options={props.options}
      isMulti
      autoFocus
      menuPortalTarget={document.body} // To avoid clipping issues
      styles={{ menuPortal: base => ({ ...base, zIndex: 9999, }) }}
      onBlur={handleBlur}
    />
  );
};

export default MultiSelectEditor;

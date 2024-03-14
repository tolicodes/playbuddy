
import { useState, useEffect } from 'react';
import yaml from 'js-yaml';

import { Kinks } from './types';

export const useLoadKinks = (): Kinks => {
    const [allKinks, setAllKinks] = useState<Kinks>([]);
  
    useEffect(() => {
      fetch('/kinks.yaml')
        .then((response) => response.text())
        .then((text) => yaml.load(text))
        .then((data) => setAllKinks(data as Kinks))
        .catch((error) => console.error('Error loading YAML: ', error));
    }, []);
  
    return allKinks;
  };
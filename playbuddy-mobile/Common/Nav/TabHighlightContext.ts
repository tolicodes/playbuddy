import { createContext, useContext } from 'react';
import type { HomeTabName } from './navigationHelpers';

type TabHighlightContextValue = {
    highlightedTab: HomeTabName | null;
    setHighlightedTab: (tab: HomeTabName | null) => void;
};

const noop = () => {};

const TabHighlightContext = createContext<TabHighlightContextValue>({
    highlightedTab: null,
    setHighlightedTab: noop,
});

const useTabHighlight = () => useContext(TabHighlightContext);

export { TabHighlightContext, useTabHighlight };

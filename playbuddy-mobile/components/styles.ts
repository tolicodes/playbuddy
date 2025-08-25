import { StyleSheet } from 'react-native';

export const LAVENDER_BACKGROUND = '#F3EBFF';          // Main screen background
export const ACCENT_PURPLE = '#9C6ADE';                // Primary action & selected states
export const HEADER_PURPLE = '#7E5BEF';
export const WHITE = '#FFFFFF';                         // Cards and selected text
export const DARK_GRAY = '#333333';                     // Primary unselected text
export const MEDIUM_GRAY = '#888888';                   // Secondary text, empty states
export const LIGHT_GRAY = '#CCCCCC';                    // Disabled titles
export const DISABLED_GRAY = '#D9D9D9';                 // Disabled dots & arrows
export const BORDER_LAVENDER = '#EAE0F8';               // Card borders

export const HORIZONTAL_PADDING = 16;


/**
 * Common shared styles for PlayBuddy React Native app
 */
export const commonStyles = StyleSheet.create({
    // Layout
    container: { flex: 1, backgroundColor: ACCENT_PURPLE },
    bottomContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -24,
        overflow: 'hidden',
    },

    // Separators
    separator: { height: 1, backgroundColor: '#EEE', marginVertical: 8 },

    // Tabs
    tabRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12 },
    tabButton: { paddingVertical: 8 },
    tabText: { color: '#888' },
    activeTab: { borderBottomWidth: 3, borderColor: ACCENT_PURPLE },
    activeTabText: { color: ACCENT_PURPLE, fontWeight: '600' },

    // Scroll & Lists
    scroll: { flex: 1, paddingTop: 8 },
    list: { paddingHorizontal: 16, paddingTop: 8 },

    // Location & Tags
    locationRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
    locationText: { color: '#555', marginLeft: 6 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 8 },
    pill: {
        backgroundColor: HEADER_PURPLE,
        borderRadius: 16,
        paddingHorizontal: 12,
        margin: 4,
        height: 32,
        justifyContent: 'center',
    },
    pillText: { color: '#fff', fontSize: 14 },

    // Empty States
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: '#000', fontSize: 16 },

    paddedHorizontalMedium: { paddingHorizontal: 16 },
});

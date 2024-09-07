import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#f8f8f8',
        borderRadius: 8,
    },
    dropdown: {
        backgroundColor: '#fff',
        padding: 12,
    },
    itemContainerStyle: {
        backgroundColor: 'green',
        borderColor: '#ddd',
    },
    selectedStyle: {
        backgroundColor: 'lightgray',
        color: 'white',
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 8,
    },
    selectedTextStyle: {
        color: 'black',
        fontSize: 16,
    },
    placeholderStyle: {
        color: '#888',
    },
    dropdownItem: {
        flexDirection: 'row',
        backgroundColor: 'white',
        alignItems: 'center',
        padding: 10,
    },
    checkmarkContainerFull: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'green',
        justifyContent: 'center',
        borderColor: 'white',
        borderWidth: 2,
        alignItems: 'center',
    },
    checkmarkContainerBlank: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginLeft: 10,
    },
    itemText: {
        flex: 1,
        marginLeft: 10,
    },
});

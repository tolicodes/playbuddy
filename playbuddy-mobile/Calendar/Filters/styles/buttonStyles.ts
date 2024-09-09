import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    resetButton: {
        flex: 1,
        backgroundColor: '#FFFFFF', // White background for reset
        borderWidth: 1,
        borderColor: '#FF3B30', // Red border for reset button
        paddingVertical: 12,
        marginHorizontal: 5,
        borderRadius: 8,
        alignItems: 'center',
    },
    resetButtonText: {
        color: '#FF3B30', // Red text for reset
        fontWeight: 'bold',
        fontSize: 16,
    },
    doneButton: {
        flex: 1,
        backgroundColor: '#007AFF', // Blue background for done
        paddingVertical: 12,
        marginHorizontal: 5,
        borderRadius: 8,
        alignItems: 'center',
    },
    doneButtonText: {
        color: 'white', // White text for done
        fontWeight: 'bold',
        fontSize: 16,
    },
});

import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Image } from 'expo-image'
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as ImagePickerLib from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';

interface DateTimePickerProps {
    label: string;
    onChange: (value: string) => void;
    value: string;
    error?: string;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ label, onChange, value, error }) => {
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

    const handleConfirm = (date: Date) => {
        setDatePickerVisibility(false);
        onChange(date.toISOString());
    };

    return (
        <View>
            <Text>{label}</Text>
            <TouchableOpacity onPress={() => setDatePickerVisibility(true)}>
                <Text>{value ? new Date(value).toLocaleString() : 'Pick a date'}</Text>
            </TouchableOpacity>
            {error && <Text style={styles.error}>{error}</Text>}
            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="datetime"
                onConfirm={handleConfirm}
                onCancel={() => setDatePickerVisibility(false)}
            />
        </View>
    );
};

interface ImagePickerProps {
    imgUrl: string | null;
    setImgUrl: (url: string) => void;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({ imgUrl, setImgUrl }) => {
    const pickImage = async () => {
        let result = await ImagePickerLib.launchImageLibraryAsync({
            mediaTypes: ImagePickerLib.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setImgUrl(result.uri);
        }
    };

    return (
        <View>
            {imgUrl ? (
                <Image source={{ uri: imgUrl }} style={{ width: 200, height: 200 }} />
            ) : (
                <Button title="Pick an image" onPress={pickImage} />
            )}
        </View>
    );
};

interface TagPickerProps {
    tags: string[];
    setTags: (tags: string[]) => void;
}

export const TagPicker: React.FC<TagPickerProps> = ({ tags, setTags }) => {
    const [text, setText] = useState('');

    const addTag = () => {
        if (text.trim()) {
            setTags([...tags, text.trim()]);
            setText('');
        }
    };

    return (
        <View>
            <TextInput value={text} onChangeText={setText} />
            <Button title="Add Tag" onPress={addTag} />
            <View style={styles.tagContainer}>
                {tags.map((tag) => (
                    <Text key={tag} style={styles.tag}>
                        {tag}
                    </Text>
                ))}
            </View>
        </View>
    );
};

interface SelectCommunityProps {
    onValueChange: (value: string) => void;
    value: string;
    error?: string;
}

export const SelectCommunity: React.FC<SelectCommunityProps> = ({ onValueChange, value, error }) => (
    <View>
        <Text>Community</Text>
        <Picker selectedValue={value} onValueChange={onValueChange}>
            {/* Load the list from API */}
            <Picker.Item label="Community 1" value="community1" />
            <Picker.Item label="Community 2" value="community2" />
        </Picker>
        {error && <Text style={styles.error}>{error}</Text>}
    </View>
);

const styles = StyleSheet.create({
    error: {
        color: 'red',
    },
    tagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    tag: {
        backgroundColor: '#ddd',
        padding: 5,
        margin: 5,
        borderRadius: 5,
    },
});

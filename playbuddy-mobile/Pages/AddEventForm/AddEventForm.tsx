import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, TextInput, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Controller, useForm } from 'react-hook-form';
import RNPickerSelect from 'react-native-picker-select';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../supabaseClient';
import RadioGroup from 'react-native-radio-buttons-group';
import { ScrollView } from 'react-native-gesture-handler';

import { Event } from '../../commonTypes';

const EventForm = () => {
    const { control, handleSubmit, formState: { errors }, setValue } = useForm();
    const [startDatePickerVisible, setStartDatePickerVisible] = useState(false);
    const [endDatePickerVisible, setEndDatePickerVisible] = useState(false);
    const [uploading, setUploading] = useState(false);

    const onSubmit = async (data: Event) => {
        console.log('Form data:', data);
        alert('Event has been submitted. A community curator will approve it shortly.');
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            const response = await fetch(result.assets[0].uri);
            const blob = await response.blob();
            const fileName = `public/${Date.now()}.jpg`;
            setUploading(true);

            const { data, error } = await supabase.storage.from('event-images').upload(fileName, blob);
            if (error) {
                console.error('Upload failed:', error.message);
            } else {
                const { publicUrl } = supabase.storage.from('event-images').getPublicUrl(fileName).data;
                setValue('image_url', publicUrl);
            }

            setUploading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Submit Your Event</Text>

            {/* Event Name */}
            <Text style={styles.label}>Event Name</Text>
            <Controller
                control={control}
                name="name"
                rules={{ required: 'Event name is required' }}
                render={({ field: { onChange, value } }) => (
                    <TextInput style={styles.input} placeholder="Event Name" value={value} onChangeText={onChange} />
                )}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}

            {/* Community */}
            <Text style={styles.label}>Community</Text>
            <Controller
                control={control}
                name="community"
                rules={{ required: 'Community is required' }}
                render={({ field: { onChange, value } }) => (
                    <RNPickerSelect
                        onValueChange={onChange}
                        value={value}
                        items={[
                            { label: 'Kink', value: 'Kink' },
                            { label: 'Acro Yoga', value: 'Acro Yoga' },
                        ]}
                        placeholder={{ label: 'Select a community', value: null }}
                    />
                )}
            />
            {errors.community && <Text style={styles.errorText}>{errors.community.message}</Text>}

            {/* Start Date */}
            <Text style={styles.label}>Start Date</Text>
            <Controller
                control={control}
                name="start_date"
                rules={{ required: 'Start date is required' }}
                render={({ field: { onChange, value } }) => (
                    <>
                        <TouchableOpacity onPress={() => setStartDatePickerVisible(true)}>
                            <Text style={styles.dateInput}>
                                {value ? new Date(value).toLocaleString() : 'Select Start Date'}
                            </Text>
                        </TouchableOpacity>
                        {startDatePickerVisible && (
                            <DateTimePicker
                                value={value ? new Date(value) : new Date()}
                                mode="datetime"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, date) => {
                                    setStartDatePickerVisible(false);
                                    if (date) onChange(date.toISOString());
                                }}
                            />
                        )}
                    </>
                )}
            />
            {errors.start_date && <Text style={styles.errorText}>{errors.start_date.message}</Text>}

            {/* End Date */}
            <Text style={styles.label}>End Date</Text>
            <Controller
                control={control}
                name="end_date"
                rules={{ required: 'End date is required' }}
                render={({ field: { onChange, value } }) => (
                    <>
                        <TouchableOpacity onPress={() => setEndDatePickerVisible(true)}>
                            <Text style={styles.dateInput}>
                                {value ? new Date(value).toLocaleString() : 'Select End Date'}
                            </Text>
                        </TouchableOpacity>
                        {endDatePickerVisible && (
                            <DateTimePicker
                                value={value ? new Date(value) : new Date()}
                                mode="datetime"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, date) => {
                                    setEndDatePickerVisible(false);
                                    if (date) onChange(date.toISOString());
                                }}
                            />
                        )}
                    </>
                )}
            />
            {errors.end_date && <Text style={styles.errorText}>{errors.end_date.message}</Text>}

            {/* Description */}
            <Text style={styles.label}>Description</Text>
            <Controller
                control={control}
                name="description"
                rules={{ required: 'Description is required' }}
                render={({ field: { onChange, value } }) => (
                    <TextInput
                        style={styles.textArea}
                        placeholder="Enter event description..."
                        value={value}
                        onChangeText={onChange}
                        multiline
                        numberOfLines={5}
                    />
                )}
            />
            {errors.description && <Text style={styles.errorText}>{errors.description.message}</Text>}

            {/* Image URL */}
            <Text style={styles.label}>Upload Event Image</Text>
            <TouchableOpacity onPress={pickImage}>
                <View style={styles.imageUploader}>
                    <Text>{uploading ? 'Uploading...' : 'Pick Image'}</Text>
                </View>
            </TouchableOpacity>

            {/* Ticket URL */}
            <Text style={styles.label}>Ticket URL</Text>
            <Controller
                control={control}
                name="ticket_url"
                rules={{
                    required: 'Ticket URL is required',
                    pattern: {
                        value: /^(ftp|http|https):\/\/[^ "]+$/,
                        message: 'Please enter a valid URL',
                    },
                }}
                render={({ field: { onChange, value } }) => (
                    <TextInput style={styles.input} placeholder="Ticket URL" value={value} onChangeText={onChange} />
                )}
            />
            {errors.ticket_url && <Text style={styles.errorText}>{errors.ticket_url.message}</Text>}

            {/* Event URL */}
            <Text style={styles.label}>Event URL</Text>
            <Controller
                control={control}
                name="event_url"
                render={({ field: { onChange, value } }) => (
                    <TextInput style={styles.input} placeholder="Event URL (optional)" value={value} onChangeText={onChange} />
                )}
            />

            {/* Location */}
            <Text style={styles.label}>Location</Text>
            <Controller
                control={control}
                name="location"
                rules={{ required: 'Location is required' }}
                render={({ field: { onChange, value } }) => (
                    <TextInput style={styles.input} placeholder="Location" value={value} onChangeText={onChange} />
                )}
            />
            {errors.location && <Text style={styles.errorText}>{errors.location.message}</Text>}

            {/* Price */}
            <Text style={styles.label}>Price</Text>
            <Controller
                control={control}
                name="price"
                rules={{ required: 'Price is required' }}
                render={({ field: { onChange, value } }) => (
                    <TextInput style={styles.input} placeholder="Price" keyboardType="numeric" value={value} onChangeText={onChange} />
                )}
            />
            {errors.price && <Text style={styles.errorText}>{errors.price.message}</Text>}

            {/* Tags
            <Text style={styles.label}>Tags</Text>
            <Controller
                control={control}
                name="tags"
                render={({ field: { onChange, value } }) => (
                    <TagInput
                        tags={value || []}
                        onChange={onChange}
                        placeholder="Add tags"
                        labelField="name"
                        valueField="name"
                        inputContainerStyle={styles.tagInput}
                    />
                )}
            /> */}

            {/* Type */}
            <Text style={styles.label}>Type</Text>
            <Controller
                control={control}
                name="type"
                render={({ field: { onChange, value } }) => (
                    <RadioGroup
                        radioButtons={[
                            { id: 'event', label: 'Event', value: 'event', selected: value === 'event' },
                            { id: 'retreat', label: 'Retreat', value: 'retreat', selected: value === 'retreat' },
                        ]}
                        onPress={(radioButtonsArray) => onChange(radioButtonsArray.find(rb => rb.selected)?.value)}
                    />
                )}
            />

            {/* Recurring */}
            <Text style={styles.label}>Recurring</Text>
            <Controller
                control={control}
                name="recurring"
                render={({ field: { onChange, value } }) => (
                    <RadioGroup
                        radioButtons={[
                            { id: 'none', label: 'None', value: 'none', selected: value === 'none' },
                            { id: 'weekly', label: 'Weekly', value: 'weekly', selected: value === 'weekly' },
                            { id: 'monthly', label: 'Monthly', value: 'monthly', selected: value === 'monthly' },
                        ]}
                        onPress={(radioButtonsArray) => onChange(radioButtonsArray.find(rb => rb.selected)?.value)}
                    />
                )}
            />

            {/* Submit Button */}
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit(onSubmit)}>
                <Text style={styles.submitButtonText}>Submit Event</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

export default EventForm;

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#f0f0f0',
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        marginTop: 20,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#ddd',
        marginBottom: 10,
    },
    textArea: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#ddd',
        height: 100,
    },
    dateInput: {
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        fontSize: 16,
        textAlign: 'center',
    },
    imageUploader: {
        backgroundColor: '#ddd',
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        marginBottom: 20,
    },
    errorText: {
        color: 'red',
        fontSize: 12,
        marginBottom: 10,
    },
    submitButton: {
        backgroundColor: '#007bff',
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

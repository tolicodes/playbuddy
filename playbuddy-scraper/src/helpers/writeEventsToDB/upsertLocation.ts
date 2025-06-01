import { supabaseClient } from '../../connections/supabaseClient.js';
import countries from 'i18n-iso-countries';
import fs from 'fs';

const en = JSON.parse(fs.readFileSync('node_modules/i18n-iso-countries/langs/en.json', 'utf8'));


countries.registerLocale(en); // Load country codes

export const NYC_LOCATION_ID = "73352aef-334c-49a6-9256-0baf91d56b49";

// Looks for country code in locations table, if not found, creates it
// using i18n-iso-countries lookup. Otherwise, name is the code
export async function upsertLocation(locationCode?: string | null): Promise<string> {
    // Assume it's NYC if no location code is provided
    if (!locationCode) return NYC_LOCATION_ID;

    // Check if the location exists in the database
    const { data: existingLocation, error: locationFetchError } = await supabaseClient
        .from('location_areas')
        .select('id')
        .eq('code', locationCode)
        .single();

    if (locationFetchError && locationFetchError.code !== 'PGRST116') {
        console.error('Error fetching location:', locationFetchError);
        throw locationFetchError;
    }

    // If location exists, return its ID
    if (existingLocation) {
        return existingLocation.id;
    }

    // If the location does not exist, create a new one
    let countryName = countries.getName(locationCode, 'en');

    // For now assume it's a city. Let's use it as the name until we manually update it
    if (!countryName) {
        countryName = locationCode;
    }

    const { data: newLocation, error: locationInsertError } = await supabaseClient
        .from('location_areas')
        .insert({ code: locationCode, name: countryName })
        .select('id')
        .single();

    if (locationInsertError) {
        console.error('Error inserting location:', locationInsertError);
        throw locationInsertError;
    }

    return newLocation.id;
}

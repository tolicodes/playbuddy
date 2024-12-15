import { supabaseClient } from "connections/supabaseClient.js";

export async function fetchPaginatedRecords(tableName: string, userId: string, pageSize: number = 1000) {
    let allData: any[] = [];
    let from = 0;
    let to = pageSize - 1;
    let hasMore = true;

    while (hasMore) {
        const { data, error, count } = await supabaseClient
            .from(tableName)
            .select('id, event_id, choice, event:events!inner(start_date)', { count: 'exact' })
            .eq('user_id', userId)
            .gte('event.start_date', new Date().toISOString())
            .range(from, to);

        if (error) {
            throw new Error(`Error fetching records: ${error.message}`);
        }

        allData = allData.concat(data);
        from += pageSize;
        to += pageSize;
        hasMore = allData.length < (count || 0);
    }

    return allData;
}
import { supabaseClient } from "../connections/supabaseClient.js";

type FetchAllRowsParams = {
    from: string;
    select: string;
    pageSize?: number;
    options?: {
        count?: 'exact' | 'planned' | 'estimated';
        head?: boolean;
    };
};

export async function fetchAllRows({
    from,
    select,
    pageSize = 1000,
    options = {},
}: FetchAllRowsParams): Promise<any[]> {
    let allRows: any[] = [];
    let offset = 0;

    while (true) {
        const { data, error } = await supabaseClient
            // @ts-ignore
            .from<T, string>(from)
            .select(select, options)
            .range(offset, offset + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        // @ts-ignore
        allRows = allRows.concat(data);
        if (data.length < pageSize) break;

        offset += pageSize;
    }

    return allRows;
}
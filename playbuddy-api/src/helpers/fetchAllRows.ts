import { supabaseClient } from "../connections/supabaseClient.js";

type FetchAllRowsParams = {
    from: string;
    select: string;
    pageSize?: number;
    where?: string; // Example: "status.eq.published"
    options?: {
        count?: 'exact' | 'planned' | 'estimated';
        head?: boolean;
    };
    queryModifier?: (query: any) => any;
};

export async function fetchAllRows({
    from,
    select,
    where,
    pageSize = 1000,
    options = {},
    queryModifier,
}: FetchAllRowsParams): Promise<any[]> {
    let allRows: any[] = [];
    let offset = 0;

    while (true) {
        let query = supabaseClient
            // @ts-ignore
            .from(from)
            .select(select, options);

        // Apply where filter if provided
        if (where) {
            const [column, operator, value] = where.split('.');
            if (!column || !operator || value === undefined) {
                throw new Error(`Invalid where clause format: ${where}`);
            }
            query = query.filter(column, operator, value);
        }

        if (queryModifier) {
            query = queryModifier(query) || query;
        }

        query = query.range(offset, offset + pageSize - 1);

        const { data, error } = await query;

        if (error) throw error;
        if (!data || data.length === 0) break;

        allRows = allRows.concat(data);
        if (data.length < pageSize) break;

        offset += pageSize;
    }

    return allRows;
}

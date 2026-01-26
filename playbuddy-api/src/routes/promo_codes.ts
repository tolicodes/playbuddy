import { Router, Request, Response } from 'express';
import { supabaseClient } from '../connections/supabaseClient.js'; // Adjust the import path to match your project
import { authenticateAdminRequest, AuthenticatedRequest } from '../middleware/authenticateRequest.js';
import { flushEvents } from '../helpers/flushCache.js';
import { fetchAllRows } from '../helpers/fetchAllRows.js';

const router = Router();

const parseNumber = (value: unknown): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
};

const parseNumberNullable = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
};

const parseDateInput = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Date && Number.isFinite(value.getTime())) return value;
    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        if (Number.isFinite(parsed.getTime())) return parsed;
    }
    return null;
};

const toUtcDate = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const toDateKey = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
const addMonths = (date: Date, months: number) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
const startOfQuarter = (date: Date) =>
    new Date(Date.UTC(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3, 1));
const quarterLabel = (date: Date) => `${date.getUTCFullYear()} Q${Math.floor(date.getUTCMonth() / 3) + 1}`;

router.get('/', async (req: Request, res: Response) => {
    const data = await fetchAllRows({
        from: 'promo_codes',
        select: '*',
        queryModifier: (query) => query.order('id', { ascending: true }),
    });

    res.json(data);

});

router.post('/', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { promo_code, scope, discount, discount_type, organizer_id, commission_rate, commission_percentage } = req.body;
    const resolvedCommissionRate = commission_rate ?? commission_percentage ?? 10;
    const { data, error } = await supabaseClient.from('promo_codes').insert({
        promo_code,
        organizer_id,
        discount,
        discount_type,
        scope,
        commission_rate: resolvedCommissionRate,
    });

    if (error) {
        console.error(`Error inserting promo code`, error);
        throw error;
    }

    res.json(data);
});

router.put('/:id', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { promo_code, scope, discount, discount_type, organizer_id, commission_rate, commission_percentage } = req.body;
    const resolvedCommissionRate = commission_rate ?? commission_percentage ?? 10;
    const { data, error } = await supabaseClient.from('promo_codes').update({
        promo_code,
        scope,
        discount,
        discount_type,
        organizer_id,
        commission_rate: resolvedCommissionRate,
    }).eq('id', id);

    if (error) {
        console.error(`Error updating promo code`, error);
        throw error;
    }

    res.json(data);
});

router.delete('/:id', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { data, error } = await supabaseClient.from('promo_codes').delete().eq('id', id);

    if (error) {
        console.error(`Error deleting promo code`, error);
        throw error;
    }

    res.json(data);
});

// ---- Promo code redemptions -------------------------------------------------

router.get('/redemptions/summary', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const organizerId = req.query.organizer_id ? Number(req.query.organizer_id) : null;
    if (!organizerId || Number.isNaN(organizerId)) {
        return res.status(400).json({ error: 'Missing organizer_id' });
    }

    const { data: promoCodes, error: promoError } = await supabaseClient
        .from('promo_codes')
        .select('id')
        .eq('organizer_id', organizerId);

    if (promoError) {
        console.error('Error fetching promo codes', promoError);
        return res.status(500).json({ error: promoError });
    }

    const promoIds = (promoCodes || []).map((pc) => pc.id);
    if (!promoIds.length) {
        return res.json([]);
    }

    const { data: redemptions, error: redemptionError } = await supabaseClient
        .from('promo_code_redemptions')
        .select('promo_code_id')
        .in('promo_code_id', promoIds);

    if (redemptionError) {
        console.error('Error fetching promo code redemptions', redemptionError);
        return res.status(500).json({ error: redemptionError });
    }

    const counts = new Map<string, number>();
    (redemptions || []).forEach((row) => {
        const id = row.promo_code_id;
        counts.set(id, (counts.get(id) || 0) + 1);
    });

    const summary = Array.from(counts.entries()).map(([promo_code_id, redemption_count]) => ({
        promo_code_id,
        redemption_count,
    }));

    return res.json(summary);
});

router.post('/redemptions/import', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const payload = req.body || {};
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    const defaultPromoCodeId = payload.promo_code_id ? String(payload.promo_code_id) : null;
    const defaultPromoCode = payload.promo_code ? String(payload.promo_code) : null;
    const organizerId = payload.organizer_id ? Number(payload.organizer_id) : null;
    const organizerName = payload.organizer_name ? String(payload.organizer_name) : null;

    if (!rows.length) {
        return res.status(400).json({ error: 'Missing rows' });
    }

    const promoCodeCache = new Map<string, { id?: string; commission_rate?: number | null; error?: string }>();
    const promoCodeIdCache = new Map<string, { id?: string; commission_rate?: number | null; error?: string }>();

    type ResolvedPromoCode = { id?: string; commission_rate?: number | null; error?: string };
    const resolvePromoCode = async (promoCode: string | null): Promise<ResolvedPromoCode> => {
        if (!promoCode) return { error: 'Missing promo_code' };
        const cacheKey = `${promoCode}|${organizerId || ''}|${organizerName || ''}`;
        const cached = promoCodeCache.get(cacheKey);
        if (cached) return cached;

        const { data: promoRows, error: promoError } = await supabaseClient
            .from('promo_codes')
            .select('id, organizer_id, commission_rate')
            .eq('promo_code', promoCode);

        if (promoError) {
            console.error('Error resolving promo code', promoError);
            const result = { error: 'Failed to resolve promo_code' };
            promoCodeCache.set(cacheKey, result);
            return result;
        }

        const matches = promoRows || [];
        if (!matches.length) {
            const result = { error: `No promo_codes found for code "${promoCode}"` };
            promoCodeCache.set(cacheKey, result);
            return result;
        }

        if (organizerId) {
            const match = matches.find((row) => row.organizer_id === organizerId);
            if (match) {
                const result = {
                    id: match.id as string,
                    commission_rate: match.commission_rate as number | null,
                };
                promoCodeCache.set(cacheKey, result);
                return result;
            }
        }

        if (organizerName) {
            const organizerIds = matches.map((row) => row.organizer_id).filter(Boolean) as number[];
            if (organizerIds.length) {
                const { data: organizers, error: orgError } = await supabaseClient
                    .from('organizers')
                    .select('id,name')
                    .in('id', organizerIds);
                if (!orgError && organizers?.length) {
                    const target = organizerName.trim().toLowerCase();
                    const orgMatch = organizers.find((org) => (org.name || '').trim().toLowerCase() === target);
                    if (orgMatch) {
                        const match = matches.find((row) => row.organizer_id === orgMatch.id);
                        if (match) {
                            const result = {
                                id: match.id as string,
                                commission_rate: match.commission_rate as number | null,
                            };
                            promoCodeCache.set(cacheKey, result);
                            return result;
                        }
                    }
                }
            }
        }

        if (matches.length === 1) {
            const match = matches[0];
            const result = {
                id: match.id as string,
                commission_rate: match.commission_rate as number | null,
            };
            promoCodeCache.set(cacheKey, result);
            return result;
        }

        const result = { error: `Multiple promo_codes found for "${promoCode}". Provide promo_code_id or organizer_id.` };
        promoCodeCache.set(cacheKey, result);
        return result;
    };

    const resolvePromoCodeById = async (promoCodeId: string | null): Promise<ResolvedPromoCode> => {
        if (!promoCodeId) return { error: 'Missing promo_code_id' };
        const cached = promoCodeIdCache.get(promoCodeId);
        if (cached) return cached;
        const { data: promoRow, error: promoError } = await supabaseClient
            .from('promo_codes')
            .select('id, commission_rate')
            .eq('id', promoCodeId)
            .single();
        if (promoError || !promoRow) {
            const result = { error: 'Failed to resolve promo_code_id' };
            promoCodeIdCache.set(promoCodeId, result);
            return result;
        }
        const result = {
            id: promoRow.id as string,
            commission_rate: promoRow.commission_rate as number | null,
        };
        promoCodeIdCache.set(promoCodeId, result);
        return result;
    };

    const prepared: Array<{
        promo_code_id: string;
        redemption_date: string;
        gross_amount: number;
        commission_amount: number;
    }> = [];
    const errors: Array<{ index: number; message: string }> = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i] || {};
        const rowPromoCodeId = row.promo_code_id ? String(row.promo_code_id) : defaultPromoCodeId;
        const rowPromoCode = row.promo_code ? String(row.promo_code) : defaultPromoCode;
        let promoCodeId = rowPromoCodeId;
        let commissionRate: number | null = null;

        if (promoCodeId) {
            const resolved = await resolvePromoCodeById(promoCodeId);
            if (!resolved?.id) {
                errors.push({ index: i, message: resolved?.error || 'Unable to resolve promo_code_id' });
                continue;
            }
            promoCodeId = resolved.id;
            commissionRate = resolved.commission_rate ?? null;
        } else {
            const resolved = await resolvePromoCode(rowPromoCode);
            if (!resolved?.id) {
                errors.push({ index: i, message: resolved?.error || 'Unable to resolve promo_code' });
                continue;
            }
            promoCodeId = resolved.id;
            commissionRate = resolved.commission_rate ?? null;
        }

        const dateInput = row.date ?? row.redemption_date;
        const parsedDate = parseDateInput(dateInput);
        if (!parsedDate) {
            errors.push({ index: i, message: 'Missing or invalid date' });
            continue;
        }

        const grossValue = parseNumberNullable(row.gross_amount);
        if (grossValue === null) {
            errors.push({ index: i, message: 'Missing or invalid gross_amount' });
            continue;
        }

        const resolvedRate = commissionRate ?? 10;
        const commissionAmount = grossValue * (resolvedRate / 100);

        prepared.push({
            promo_code_id: promoCodeId,
            redemption_date: parsedDate.toISOString(),
            gross_amount: grossValue,
            commission_amount: commissionAmount,
        });
    }

    if (!prepared.length) {
        return res.status(400).json({ error: 'No valid rows to import', errors });
    }

    const buildKey = (row: typeof prepared[number]) =>
        `${row.promo_code_id}|${row.redemption_date}|${row.gross_amount.toFixed(4)}|${row.commission_amount.toFixed(4)}`;

    const uniqueMap = new Map<string, typeof prepared[number]>();
    prepared.forEach((row) => {
        const key = buildKey(row);
        if (!uniqueMap.has(key)) uniqueMap.set(key, row);
    });
    const uniqueRows = Array.from(uniqueMap.values());

    const rowsByPromo = new Map<string, typeof uniqueRows>();
    uniqueRows.forEach((row) => {
        const list = rowsByPromo.get(row.promo_code_id) || [];
        list.push(row);
        rowsByPromo.set(row.promo_code_id, list);
    });

    const existingKeys = new Set<string>();
    for (const [promoCodeId, list] of rowsByPromo.entries()) {
        const dates = list.map((row) => row.redemption_date).sort();
        const minDate = dates[0];
        const maxDate = dates[dates.length - 1];
        const { data: existingRows, error: existingError } = await supabaseClient
            .from('promo_code_redemptions')
            .select('redemption_date,gross_amount,commission_amount')
            .eq('promo_code_id', promoCodeId)
            .gte('redemption_date', minDate)
            .lte('redemption_date', maxDate);
        if (existingError) {
            console.error('Error checking existing promo code redemptions', existingError);
            continue;
        }
        (existingRows || []).forEach((row) => {
            const key = `${promoCodeId}|${row.redemption_date}|${parseNumber(row.gross_amount).toFixed(4)}|${parseNumber(row.commission_amount).toFixed(4)}`;
            existingKeys.add(key);
        });
    }

    const insertRows = uniqueRows.filter((row) => !existingKeys.has(buildKey(row)));

    if (!insertRows.length) {
        return res.json({
            inserted_count: 0,
            skipped_count: rows.length,
            promo_code_ids: Array.from(rowsByPromo.keys()),
            errors,
        });
    }

    const { data, error } = await supabaseClient.from('promo_code_redemptions').insert(insertRows);
    if (error) {
        console.error('Error importing promo code redemptions', error);
        return res.status(500).json({ error });
    }

    return res.json({
        inserted_count: insertRows.length,
        skipped_count: rows.length - insertRows.length,
        promo_code_ids: Array.from(rowsByPromo.keys()),
        errors,
        data,
    });
});

router.get('/:id/redemptions', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const { data, error } = await supabaseClient
        .from('promo_code_redemptions')
        .select('*')
        .eq('promo_code_id', id)
        .order('redemption_date', { ascending: false });

    if (error) {
        console.error('Error fetching promo code redemptions', error);
        return res.status(500).json({ error });
    }

    return res.json(data || []);
});

router.get('/:id/redemptions/stats', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const { data, error } = await supabaseClient
        .from('promo_code_redemptions')
        .select('redemption_date,gross_amount,commission_amount')
        .eq('promo_code_id', id)
        .order('redemption_date', { ascending: true });

    if (error) {
        console.error('Error fetching promo code redemption stats', error);
        return res.status(500).json({ error });
    }

    const rows = (data || []).map((row) => ({
        redemption_date: new Date(row.redemption_date),
        gross_amount: parseNumber(row.gross_amount),
        commission_amount: parseNumber(row.commission_amount),
    }));

    const redemptionCount = rows.length;
    const grossTotal = rows.reduce((sum, row) => sum + row.gross_amount, 0);
    const commissionTotal = rows.reduce((sum, row) => sum + row.commission_amount, 0);
    const avgGross = redemptionCount ? grossTotal / redemptionCount : 0;
    const avgCommission = redemptionCount ? commissionTotal / redemptionCount : 0;

    const now = toUtcDate(new Date());
    const currentQuarterStart = startOfQuarter(now);
    const firstQuarterStart = rows.length ? startOfQuarter(toUtcDate(rows[0].redemption_date)) : currentQuarterStart;

    const quarters = [] as Array<{
        quarter: string;
        start_date: string;
        end_date: string;
        redemption_count: number;
        gross_total: number;
        commission_total: number;
    }>;

    for (let cursor = firstQuarterStart; cursor <= currentQuarterStart; cursor = addMonths(cursor, 3)) {
        const nextQuarter = addMonths(cursor, 3);
        const startKey = toDateKey(cursor);
        const endKey = toDateKey(addDays(nextQuarter, -1));

        const quarterRows = rows.filter((row) => row.redemption_date >= cursor && row.redemption_date < nextQuarter);
        const qCount = quarterRows.length;
        const qGross = quarterRows.reduce((sum, row) => sum + row.gross_amount, 0);
        const qCommission = quarterRows.reduce((sum, row) => sum + row.commission_amount, 0);

        quarters.push({
            quarter: quarterLabel(cursor),
            start_date: startKey,
            end_date: endKey,
            redemption_count: qCount,
            gross_total: qGross,
            commission_total: qCommission,
        });
    }

    const buildSeries = (start: Date, end: Date) => {
        const map = new Map<string, { date: string; redemption_count: number; gross_total: number; commission_total: number }>();
        for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
            const key = toDateKey(cursor);
            map.set(key, { date: key, redemption_count: 0, gross_total: 0, commission_total: 0 });
        }
        rows.forEach((row) => {
            const day = toUtcDate(row.redemption_date);
            if (day < start || day > end) return;
            const key = toDateKey(day);
            const entry = map.get(key);
            if (!entry) return;
            entry.redemption_count += 1;
            entry.gross_total += row.gross_amount;
            entry.commission_total += row.commission_amount;
        });
        return Array.from(map.values());
    };

    const last30Start = addDays(now, -29);
    const last3MonthsStart = addMonths(now, -3);
    const allTimeStart = rows.length ? toUtcDate(rows[0].redemption_date) : now;

    const series = {
        last_30_days: buildSeries(last30Start, now),
        last_3_months: buildSeries(last3MonthsStart, now),
        all_time: rows.length ? buildSeries(allTimeStart, now) : [],
    };

    return res.json({
        promo_code_id: id,
        totals: {
            redemption_count: redemptionCount,
            gross_total: grossTotal,
            commission_total: commissionTotal,
            avg_gross: avgGross,
            avg_commission: avgCommission,
        },
        quarters,
        series,
    });
});

router.post('/:id/redemptions', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { redemption_date, gross_amount, commission_amount } = req.body;

    if (!redemption_date || gross_amount === undefined || gross_amount === null) {
        return res.status(400).json({ error: 'Missing redemption_date or gross_amount' });
    }

    const { data: promoCode, error: promoError } = await supabaseClient
        .from('promo_codes')
        .select('commission_rate')
        .eq('id', id)
        .single();

    if (promoError) {
        console.error('Error fetching promo code commission rate', promoError);
        return res.status(500).json({ error: promoError });
    }

    const grossValue = parseNumber(gross_amount);
    const commissionRate = parseNumber(
        promoCode?.commission_rate !== undefined && promoCode?.commission_rate !== null
            ? promoCode?.commission_rate
            : 10
    );
    const commissionValue = commission_amount !== undefined && commission_amount !== null
        ? parseNumber(commission_amount)
        : grossValue * (commissionRate / 100);

    const { data, error } = await supabaseClient.from('promo_code_redemptions').insert({
        promo_code_id: id,
        redemption_date,
        gross_amount: grossValue,
        commission_amount: commissionValue,
    });

    if (error) {
        console.error(`Error inserting promo code redemption`, error);
        return res.status(500).json({ error });
    }

    return res.json(data);
});


// POST /promo_codes/events
// Adds a promo code to an event

router.post('/events', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { promo_code_id, event_id } = req.body;

    if (!promo_code_id || !event_id) {
        return res.status(400).json({ error: 'Missing promo_code_id or event_id' });
    }

    const { data, error, status, statusText } = await supabaseClient
        .from('promo_code_event')
        .insert({ promo_code_id, event_id })

    await flushEvents();

    if (error) {
        return res.status(status).json({ error: error });
    }

    return res.status(200).json(data);
});

// Removes a promo code from an event

router.delete('/events', authenticateAdminRequest, async (req: AuthenticatedRequest, res: Response) => {
    const { promo_code_id, event_id } = req.body;

    if (!promo_code_id || !event_id) {
        return res.status(400).json({ error: 'Missing promo_code_id or event_id' });
    }

    const { error } = await supabaseClient
        .from('promo_code_event')
        .delete()
        .eq('promo_code_id', promo_code_id)
        .eq('event_id', event_id);

    await flushEvents();

    if (error) {
        console.log(error)
        return res.status(500).json({ error: error });
    }

    return res.status(200).json({ success: true });
});

export default router;

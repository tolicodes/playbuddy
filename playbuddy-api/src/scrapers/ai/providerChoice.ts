import { openai, MODEL } from './config.js';
import { dbg } from './debug.js';

type Candidate = {
    provider: string;
    truncated: string;
    jsonBlobs?: string[];
};

export async function chooseProviderLLM(candidates: Candidate[], url: string): Promise<string | null> {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0].provider;

    const capped = candidates.map(c => ({
        provider: c.provider,
        snippet: c.truncated.slice(0, 60000),
        json: (c.jsonBlobs || []).join('\n').slice(0, 20000),
    }));

    const prompt = [
        `You are selecting which rendered HTML is clearer for extracting event details (name, date/time, description, ticket link) for URL: ${url}.`,
        `Choose the provider that gives the most complete, human-readable event content.`,
        `Return ONLY strict JSON: { "provider": "<name>", "reason": "<short>" }.`,
        `Providers:`,
        ...capped.map(c => `--- ${c.provider.toUpperCase()} ---\nHTML:\n${c.snippet}\nJSON:\n${c.json}`),
    ].join('\n\n');

    try {
        const resp = await openai.chat.completions.create({
            model: MODEL,
            temperature: 0,
            messages: [{ role: 'user', content: prompt }],
        });
        const raw = resp.choices[0]?.message?.content ?? '';
        const match = raw.match(/"provider"\s*:\s*"([^"]+)"/i);
        const picked = match?.[1] || null;
        dbg('LLM provider choice', { picked, raw: raw.slice(0, 200) });
        return picked;
    } catch (err: any) {
        dbg('LLM provider choice failed', err?.message || String(err));
        return null;
    }
}

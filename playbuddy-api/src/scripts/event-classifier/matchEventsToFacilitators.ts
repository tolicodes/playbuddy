import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface Facilitator {
    id: string;
    name: string;
}

export interface Event {
    id: string;
    hosts: string[];
}

export interface MatchResult {
    eventId: string;
    facilitatorIds: string[];
}

// --- Get OpenAI Embedding ---
async function getEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
    });

    return response.data[0].embedding;
}

// --- Cosine Similarity ---
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magA * magB);
}

// --- Main Function ---
export async function matchEventsToFacilitators(
    facilitators: Facilitator[],
    events: Event[],
    threshold = 0.85
): Promise<MatchResult[]> {
    const facilitatorEmbeddings: Record<string, { name: string; embedding: number[] }> = {};

    // Cache facilitator embeddings
    for (const f of facilitators) {
        const embedding = await getEmbedding(f.name);
        facilitatorEmbeddings[f.id] = { name: f.name, embedding };
    }

    const results: MatchResult[] = [];

    for (const event of events) {
        const matchedIds = new Set<string>();

        for (const host of event.hosts || []) {
            const hostEmbedding = await getEmbedding(host);

            let bestId: string | null = null;
            let bestScore = -1;

            for (const [facId, { embedding }] of Object.entries(facilitatorEmbeddings)) {
                const score = cosineSimilarity(hostEmbedding, embedding);
                if (score > bestScore) {
                    bestScore = score;
                    bestId = facId;
                }
            }

            if (bestId && bestScore >= threshold) {
                matchedIds.add(bestId);
                console.log(`✔ Matched "${host}" to "${facilitatorEmbeddings[bestId].name}" (score: ${bestScore.toFixed(3)})`);
            } else {
                console.log(`✖ No match for "${host}" (best score: ${bestScore.toFixed(3)})`);
            }
        }

        if (matchedIds.size > 0) {
            results.push({
                eventId: event.id,
                facilitatorIds: Array.from(matchedIds),
            });
        }
    }

    return results;
}

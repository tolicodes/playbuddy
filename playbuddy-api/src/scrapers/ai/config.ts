// src/scrapers/ai/config.ts
import TurndownService from 'turndown';
import OpenAI from 'openai';

export const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
export const OXY_REALTIME_URL = process.env.OXY_REALTIME_URL ?? 'https://realtime.oxylabs.io/v1/queries';
export const OXY_USERNAME = process.env.OXY_USERNAME ?? '';
export const OXY_PASSWORD = process.env.OXY_PASSWORD ?? '';

export const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
});

// Keep <br> as a hard line break (two spaces + newline is common in MD)
turndown.addRule('lineBreak', {
    filter: 'br',
    replacement: () => '  \n',
});

// Ensure empty paragraphs aren’t dropped (helps preserve spacing)
turndown.addRule('preserveEmptyParas', {
    filter: (node) => node.nodeName === 'P' && node.textContent?.trim() === '',
    replacement: () => '\n\n',
});
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

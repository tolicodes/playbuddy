import TurndownService from 'turndown';
import { Page } from 'puppeteer';

export const extractHtmlToMarkdown = async (page: Page, selector: string): Promise<string> => {
    // Extract HTML content from a specific element
    const outputHtml = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.innerHTML : '';
    }, selector);

    if (!outputHtml) {
        throw new Error(`No content found for selector: ${selector}`);
    }

    // Initialize Turndown service
    const turndownService = new TurndownService();

    // Convert HTML to Markdown
    const markdown = turndownService.turndown(outputHtml);
    return markdown
}
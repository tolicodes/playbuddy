// generate_flyers.mjs
// ──────────────────────────────────────────────────────────────────────────
// 1) Clears output directories.
// 2) Reads sizes.json to pick a configuration by `FLYER_NAME`.
// 3) Reads input/input.csv (ID, Flyer version, URL).
// 4) For each row:
//    a) generate a 300×300 QR + 16px “ID” flush‐right under it → a 300×325 SVG.
//    b) rasterize that SVG to PNG → output/filled_qrs/pngs/{ID}.png
//    c) If business_card:
//         create a 252×144 pt PDF with back.png as background, then embed QR at (qr_x, qr_y, qr_width, qr_height) 
//         → output/filled_pdfs/{ID}.pdf
//       Else:
//         load input/input.pdf, embed the QR at (qr_x, qr_y, qr_width, qr_height) 
//         → output/filled_pdfs/{ID}.pdf
// 5) Once all individual PDFs are created, merge them into output/final_combined.pdf.
// 6) If config.is_business_card === true, also:
//      a) generate pages of front cards (no QR) using front.png → tiled into cards_8x11.pdf
//      b) generate pages of back cards (with QR) by tiling the filled PDFs → appended to cards_8x11.pdf
//
// Directory layout (relative to script):
// ├─ input/
// │    ├─ input.csv
// │    ├─ input.pdf          (used when type !== "business_card")
// │    ├─ front.png          (background for front of cards)
// │    ├─ back.png           (background for back of cards)
// │    └─ sizes.json
// └─ output/
//      ├─ filled_qrs/
//      │    └─ pngs/
//      ├─ filled_pdfs/
//      ├─ final_combined.pdf
//      └─ cards_8x11.pdf
//
// Usage:
//    node generate_flyers.mjs
// Make sure you have installed:
//    npm install csv-parser qrcode sharp pdf-lib

import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ─── ESM __dirname / __filename shim ─────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── 0) Configuration ────────────────────────────────────────────────────────────────────

// ** Select which flyer configuration to use (must match `flyer_name` in sizes.json) **
const FLYER_NAME = 'business_card';

// ** Paths **
const INPUT_DIR = path.join(__dirname, 'input');
const OUTPUT_DIR = path.join(__dirname, 'output');
const PNG_DIR = path.join(OUTPUT_DIR, 'filled_qrs', 'pngs');
const PDF_DIR = path.join(OUTPUT_DIR, 'filled_pdfs');
const COMBINED_PATH = path.join(OUTPUT_DIR, 'final_combined.pdf');
const CARDS_PATH = path.join(OUTPUT_DIR, 'cards_8x11.pdf');

const INPUT_CSV_PATH = path.join(INPUT_DIR, 'input.csv');
const TEMPLATE_PDF = path.join(INPUT_DIR, 'input.pdf');
const FRONT_PNG = path.join(INPUT_DIR, 'front.png');
const BACK_PNG = path.join(INPUT_DIR, 'back.png');
const SIZES_JSON_PATH = path.join(INPUT_DIR, 'sizes.json');

// Ensure these output directories exist (or create them)
for (const dir of [PNG_DIR, PDF_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── 0a) Clear old contents of a directory ─────────────────────────────────────────────────────
function clearDirectory(dirPath: string) {
    if (!fs.existsSync(dirPath)) return;
    for (const entry of fs.readdirSync(dirPath)) {
        const fullPath = path.join(dirPath, entry);
        const stat = fs.lstatSync(fullPath);
        if (stat.isDirectory()) {
            fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
            fs.unlinkSync(fullPath);
        }
    }
}

// Clear `filled_qrs/pngs` and `filled_pdfs` before starting
clearDirectory(PNG_DIR);
clearDirectory(PDF_DIR);

// ─── 1) Load sizes.json and select the matching configuration ───────────────────────────────────
const sizes = JSON.parse(fs.readFileSync(SIZES_JSON_PATH, 'utf-8')) as any[];
const config = sizes.find(item => item.flyer_name === FLYER_NAME);

if (!config) {
    console.error(`❌ Flyer configuration "${FLYER_NAME}" not found in sizes.json`);
    process.exit(1);
}

// Destructure config: expect fields:
//   flyer_name, type, is_business_card, qr_width, qr_height, qr_x, qr_y
const {
    type,
    qr_width,
    qr_height,
    qr_x,
    qr_y
} = config;

// ─── 2) Utility: generate a 300×300 SVG QR for a given URL ─────────────────────────────────────
async function generateQrSvg(url: string, size = 300) {
    return QRCode.toString(url, {
        type: 'svg',
        width: size,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' },
    });
}

// ─── 3) Utility: build a 300×325 SVG that places [QR] on top (300×300) and [ID, 16px] below ─────────
function buildCombinedSvgWithIdBelow(qrSvgString: string, idString: string) {
    const TOTAL_WIDTH = 300;
    const BAND_HEIGHT = 25;
    const TOTAL_HEIGHT = 300 + BAND_HEIGHT;

    const qrBase64 = Buffer.from(qrSvgString).toString('base64');
    const qrDataUri = `data:image/svg+xml;base64,${qrBase64}`;

    const textFontSize = 16;
    const rightMargin = 5;
    const textX = TOTAL_WIDTH - rightMargin;
    const textY = 300 + BAND_HEIGHT / 2;

    return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${TOTAL_WIDTH}" height="${TOTAL_HEIGHT}">
    <image x="0" y="0" width="300" height="300" href="${qrDataUri}" />
    <rect x="0" y="300" width="300" height="${BAND_HEIGHT}" fill="white" />
    <text x="${textX}" y="${textY}" font-family="sans-serif" font-size="${textFontSize}"
          fill="black" text-anchor="end" dominant-baseline="middle"
    >${idString}</text>
  </svg>`;
}

// ─── 4) Preload template and back/front PNG bytes ─────────────────────────────────────────────────
const templatePdfBytes = fs.existsSync(TEMPLATE_PDF) ? fs.readFileSync(TEMPLATE_PDF) : null;
const frontPngBytes = fs.existsSync(FRONT_PNG) ? fs.readFileSync(FRONT_PNG) : null;
const backPngBytes = fs.existsSync(BACK_PNG) ? fs.readFileSync(BACK_PNG) : null;

if (type === 'business_card' && (!frontPngBytes || !backPngBytes)) {
    console.error('❌ For business cards, both front.png and back.png must exist in input/ directory.');
    process.exit(1);
}

// ─── 5) Track CSV rows processed ────────────────────────────────────────────────────────────────
let totalRows = 0;
let processedRows = 0;

const BUSINESS_CARD_WIDTH = 1050;
const BUSINESS_CARD_HEIGHT = 600;

/**
 * Creates a 252×144 pt PDF for the _back_ of a card:
 *   - draw back.png full-page,
 *   - embed the QR+ID PNG at (qr_x, qr_y, qr_width, qr_height).
 * Saves to output/filled_pdfs/{id}.pdf.
 */
async function createBackPdf(id: string, pngBuffer: Buffer) {
    const cardPdf = await PDFDocument.create();
    const page = cardPdf.addPage([BUSINESS_CARD_WIDTH, BUSINESS_CARD_HEIGHT]);

    // Embed back.png as full-page background
    // @ts-ignore
    const embeddedBack = await cardPdf.embedPng(backPngBytes);
    page.drawImage(embeddedBack, {
        x: 0,
        y: 0,
        width: BUSINESS_CARD_WIDTH,
        height: BUSINESS_CARD_HEIGHT,
    });

    // Embed the QR+ID PNG on top
    // @ts-ignore
    const embeddedQr = await cardPdf.embedPng(pngBuffer);
    page.drawImage(embeddedQr, {
        x: qr_x,
        y: qr_y,
        width: qr_width,
        height: qr_height,
    });

    const pdfBytes = await cardPdf.save();
    const pdfFileName = `${id}.pdf`;
    const pdfOutputPath = path.join(PDF_DIR, pdfFileName);
    fs.writeFileSync(pdfOutputPath, pdfBytes);
    console.log(`  📄  Created back PDF: filled_pdfs/${pdfFileName}`);
}

/**
 * For non-business-card types, embed QR+ID PNG onto input/input.pdf at (qr_x, qr_y) and size.
 * Saves to output/filled_pdfs/{id}.pdf.
 */
async function createFlyerPdf(id: string, pngBuffer: Buffer) {
    if (!templatePdfBytes) {
        console.error(`❌ Cannot create flyer PDF for "${id}" because input.pdf is missing.`);
        return;
    }
    const flyerPdf = await PDFDocument.load(templatePdfBytes);
    const [firstPage] = flyerPdf.getPages();

    // @ts-ignore
    const embeddedQr = await flyerPdf.embedPng(pngBuffer);
    firstPage.drawImage(embeddedQr, {
        x: qr_x,
        y: qr_y,
        width: qr_width,
        height: qr_height,
    });

    const pdfBytes = await flyerPdf.save();
    const pdfFileName = `${id}.pdf`;
    const pdfOutputPath = path.join(PDF_DIR, pdfFileName);
    fs.writeFileSync(pdfOutputPath, pdfBytes);
    console.log(`  📄  Created flyer PDF: filled_pdfs/${pdfFileName}`);
}

/**
 * Processes one CSV row:
 *  - generate QR+ID PNG,
 *  - save to filled_qrs/pngs/{ID}.png,
 *  - then either createBackPdf or createFlyerPdf.
 */
async function processRow(id: string, url: string) {
    // a) Generate 300×300 QR SVG
    const rawQrSvg = await generateQrSvg(url, 300);

    // b) Build 300×325 SVG (QR + ID)
    const combinedSvg = buildCombinedSvgWithIdBelow(rawQrSvg, id);

    // c) Rasterize to PNG buffer
    const pngBuffer = await sharp(Buffer.from(combinedSvg)).png().toBuffer();

    // d) Save PNG to output/filled_qrs/pngs/{ID}.png
    const pngFileName = `${id}.png`;
    const pngOutputPath = path.join(PNG_DIR, pngFileName);
    // @ts-ignore
    await fs.promises.writeFile(pngOutputPath, pngBuffer);
    console.log(`  🖼  Generated PNG: filled_qrs/pngs/${pngFileName}`);

    // e) Create appropriate PDF
    if (type === 'business_card') {
        await createBackPdf(id, pngBuffer);
    } else {
        await createFlyerPdf(id, pngBuffer);
    }
}

// ─── 6) Merge all filled PDFs into one: output/final_combined.pdf ─────────────────────────────────
async function mergeAllPdfs() {
    try {
        console.log('\nMerging all individual PDFs into final_combined.pdf…');

        const pdfFiles = fs
            .readdirSync(PDF_DIR)
            .filter((f) => f.toLowerCase().endsWith('.pdf'))
            .sort();

        if (pdfFiles.length === 0) {
            console.warn('⚠️  No PDFs found in filled_pdfs to merge.');
            return;
        }

        const mergedPdf = await PDFDocument.create();

        for (const fileName of pdfFiles) {
            const filePath = path.join(PDF_DIR, fileName);
            const pdfBytes = fs.readFileSync(filePath);
            const pdf = await PDFDocument.load(pdfBytes);

            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));

            console.log(`    ✅ Appended: ${fileName}`);
        }

        const mergedBytes = await mergedPdf.save();
        fs.writeFileSync(COMBINED_PATH, mergedBytes);
        console.log(`\n🎉 final_combined.pdf created at: output/final_combined.pdf`);
    } catch (err) {
        console.error('❌ Error merging PDFs:', err);
    }
}




// ─── 7) If business_card, tile front.png and then back PDFs into 8.5×11 sheets ─────────────────────
async function tileBusinessCards() {
    if (type !== 'business_card') return;

    console.log('\nTiling business cards into combined_cards_8x11.pdf…');

    // 1) Count total cards (equal to number of rows in CSV, or number of PDFs)
    const pdfFiles = fs
        .readdirSync(PDF_DIR)
        .filter((f) => f.toLowerCase().endsWith('.pdf'))
        .sort()
        .map((fn) => path.join(PDF_DIR, fn));

    const totalCards = pdfFiles.length;
    if (totalCards === 0) {
        console.warn('⚠️  No back PDFs to tile for business cards.');
        return;
    }

    // 2) Prepare new PDFDocument to hold both front and back pages
    const doc = await PDFDocument.create();

    // 3) Define constants
    const SAFE_W = 252;   // 3.5" = 252 pt
    const SAFE_H = 144;   // 2.0" = 144 pt
    const PG_W = 612;     // 8.5" = 612 pt
    const PG_H = 792;     // 11"  = 792 pt
    const PAD = 36;       // ½" = 36 pt
    const START_X = PAD;
    const START_Y = PG_H - PAD - SAFE_H; // 792 - 36 - 144 = 612

    // 4) Precompute positions for a 2×5 grid
    const positions = [];
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 2; col++) {
            const x = START_X + col * SAFE_W;
            const y = START_Y - row * SAFE_H;
            positions.push({ x, y });
        }
    }

    // 5) TILE ALTERNATING FRONT/BACK pages
    const pagesNeeded = Math.ceil(totalCards / 10);
    // @ts-ignore
    const frontEmbedded = await doc.embedPng(frontPngBytes);

    for (let p = 0; p < pagesNeeded; p++) {
        const batch = pdfFiles.slice(p * 10, p * 10 + 10);

        // ─ Front page
        const frontPage = doc.addPage([PG_W, PG_H]);
        const cardsInPage = batch.length;
        for (let i = 0; i < cardsInPage; i++) {
            const { x, y } = positions[i];
            frontPage.drawImage(frontEmbedded, {
                x,
                y,
                width: SAFE_W,
                height: SAFE_H,
            });
        }
        console.log(`  📄 Added front side page ${p + 1} with ${cardsInPage} card(s).`);

        // ─ Back page
        const backPage = doc.addPage([PG_W, PG_H]);
        for (let i = 0; i < batch.length; i++) {
            const pdfBytes = fs.readFileSync(batch[i]);
            // @ts-ignore
            const embeddedPages = await doc.embedPdf(pdfBytes);
            const embeddedPage = embeddedPages[0];
            const { x, y } = positions[i];
            backPage.drawPage(embeddedPage, {
                x,
                y,
                width: SAFE_W,
                height: SAFE_H,
            });
        }
        console.log(`  📄 Added back side page ${p + 1} with ${cardsInPage} card(s).`);
    }


    // 7) Save combined front+back PDF
    const combinedBytes = await doc.save();
    fs.writeFileSync(CARDS_PATH, combinedBytes);
    console.log(`\n🎉 combined_cards_8x11.pdf created at: output/cards_8x11.pdf`);
}

// ─── 8) Main: Read CSV, process rows, then merge & tile ───────────────────────────────────────────
(async () => {
    console.log('\nStarting flyer generation…\n');

    fs.createReadStream(INPUT_CSV_PATH)
        .pipe(csv())
        .on('data', async (row) => {
            console.log('row', row)
            totalRows += 1;

            try {
                const idRaw = String(row['ID'] || '').trim();
                const code = String(row['URL'] || '').trim();
                const url = `https://l.playbuddy.me/${code}`;

                if (!idRaw || !url) {
                    console.warn(`  ⚠️ Skipping invalid row: ${JSON.stringify(row)}`);
                    processedRows += 1;
                    if (processedRows === totalRows) {
                        await mergeAllPdfs();
                        await tileBusinessCards();
                    }
                    return;
                }

                await processRow(idRaw, url);
            } catch (err) {
                console.error(`  ✖️ Error processing row ${JSON.stringify(row)}:\n`, err);
            } finally {
                processedRows += 1;
                if (processedRows === totalRows) {
                    await mergeAllPdfs();
                    await tileBusinessCards();
                }
            }
        })
        .on('end', () => {
            console.log('\nAll CSV rows have been queued. Waiting for completion…\n');
        })
        .on('error', (err) => {
            console.error('❌ Failed reading CSV:', err);
        });
})();

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { generateWeeklyPicksImage } from '../helpers/weeklyPicksImage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TZ = 'America/New_York';

type Args = {
    weekOffset: number;
    width?: number;
    scale?: number;
    limit?: number;
    outPath: string;
};

const parseArgs = (): Args => {
    const args = new Map<string, string>();
    for (let i = 2; i < process.argv.length; i += 1) {
        const raw = process.argv[i];
        if (!raw.startsWith('--')) continue;
        const key = raw.slice(2);
        const next = process.argv[i + 1];
        if (next && !next.startsWith('--')) {
            args.set(key, next);
            i += 1;
        } else {
            args.set(key, 'true');
        }
    }

    const parseNumber = (value: string | undefined) => {
        if (!value) return undefined;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    };

    const weekOffset = parseNumber(args.get('weekOffset')) ?? 0;
    const width = parseNumber(args.get('width'));
    const scale = parseNumber(args.get('scale'));
    const limit = parseNumber(args.get('limit'));

    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const outArg = args.get('out');
    const outPath = outArg
        ? path.resolve(outArg)
        : path.join(
            outputDir,
            `weekly_picks_${moment.tz(TZ).format('YYYY_MM_DD')}.png`
        );

    return {
        weekOffset,
        width,
        scale,
        limit,
        outPath,
    };
};

const main = async () => {
    const { weekOffset, width, scale, limit, outPath } = parseArgs();
    const { png, weekLabel } = await generateWeeklyPicksImage({
        weekOffset,
        width,
        scale,
        limit,
    });

    await fs.promises.writeFile(outPath, png);
    console.log(`Weekly picks image saved to ${outPath} (${weekLabel})`);
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

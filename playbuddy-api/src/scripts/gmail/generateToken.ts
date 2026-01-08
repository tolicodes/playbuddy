import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { OAuth2Client } from 'google-auth-library';

const DEFAULT_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

type Args = {
    credentialsPath: string;
    tokenPath: string;
    scopes: string[];
    authUrl?: string;
    envPath: string;
    writeFile: boolean;
};

function parseArgs(): Args {
    const args = process.argv.slice(2);
    const flags = new Map<string, string>();
    for (let i = 0; i < args.length; i += 1) {
        const raw = args[i];
        if (!raw.startsWith('--')) continue;
        const key = raw.slice(2);
        const next = args[i + 1];
        if (next && !next.startsWith('--')) {
            flags.set(key, next);
            i += 1;
        } else {
            flags.set(key, 'true');
        }
    }

    const credentialsPath = flags.get('credentials')
        || process.env.GMAIL_CREDENTIALS_PATH
        || path.resolve(process.cwd(), 'gmail_credentials.json');
    const tokenPath = flags.get('out')
        || process.env.GMAIL_TOKEN_PATH
        || path.resolve(process.cwd(), 'gmail_token.json');
    const scopesRaw = flags.get('scopes') || process.env.GMAIL_SCOPES || DEFAULT_SCOPES.join(',');
    const scopes = scopesRaw.split(',').map(s => s.trim()).filter(Boolean);
    const authUrl = flags.get('url') || process.env.GMAIL_OAUTH_URL;
    const envPath = flags.get('env')
        || process.env.ENV_PATH
        || path.resolve(process.cwd(), '.env');

    const writeFile = flags.get('write-file') === 'true' || flags.get('write-file') === '1';

    return { credentialsPath, tokenPath, scopes, authUrl, envPath, writeFile };
}

async function loadCredentials(credentialsPath: string) {
    if (!fs.existsSync(credentialsPath)) {
        throw new Error(`Missing Gmail credentials at ${credentialsPath}`);
    }
    const raw = fs.readFileSync(credentialsPath, 'utf-8');
    const json = JSON.parse(raw);
    const cfg = json.installed || json.web;
    if (!cfg?.client_id || !cfg?.client_secret) {
        throw new Error('Invalid credentials JSON: missing client_id/client_secret');
    }
    return cfg;
}

async function promptForCode(authUrl: string): Promise<string> {
    console.log('Authorize this app by visiting this URL:\n');
    console.log(authUrl + '\n');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question('Paste the full redirect URL (or just the code): ', (code) => {
            rl.close();
            resolve(code.trim());
        });
    });
}

function extractCodeFromUrl(authUrl?: string): string | null {
    if (!authUrl) return null;
    try {
        const parsed = new URL(authUrl);
        return parsed.searchParams.get('code');
    } catch {
        return null;
    }
}

function upsertEnvVar(envPath: string, key: string, value: string) {
    const line = `${key}=${value}`;
    let contents = '';
    if (fs.existsSync(envPath)) {
        contents = fs.readFileSync(envPath, 'utf-8');
    }

    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(contents)) {
        contents = contents.replace(re, line);
    } else {
        if (contents.length && !contents.endsWith('\n')) contents += '\n';
        contents += line + '\n';
    }

    fs.writeFileSync(envPath, contents);
}

async function main() {
    const { credentialsPath, tokenPath, scopes, authUrl: authUrlArg, envPath, writeFile } = parseArgs();
    const cfg = await loadCredentials(credentialsPath);

    const oAuth2Client = new OAuth2Client(cfg.client_id, cfg.client_secret, cfg.redirect_uris?.[0]);
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: scopes,
    });

    const prefilled = extractCodeFromUrl(authUrlArg);
    const input = prefilled || await promptForCode(authUrl);
    const code = extractCodeFromUrl(input) || input;
    if (!code) {
        throw new Error('No code provided');
    }

    const { tokens } = await oAuth2Client.getToken(code);
    if (!tokens?.refresh_token) {
        console.warn('No refresh_token returned. Try again with prompt=consent or revoke previous consent.');
    }

    if (writeFile) {
        fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
        console.log(`Token stored to ${tokenPath}`);
    }
    const envPayload = {
        client_id: cfg.client_id,
        client_secret: cfg.client_secret,
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        scope: tokens.scope,
        token_type: tokens.token_type,
        expiry_date: tokens.expiry_date,
    };
    const tokenJson = JSON.stringify(envPayload);
    upsertEnvVar(envPath, 'GMAIL_TOKEN_JSON', tokenJson);
    console.log(`Env updated at ${envPath} (GMAIL_TOKEN_JSON)`);
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});

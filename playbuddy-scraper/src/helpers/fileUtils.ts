import fs from "fs";

export const readJSON = (filePath: string): any[] => {
    if (!fs.existsSync(filePath)) {
        return [];
    }
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export const writeJSON = (filePath: string, data: unknown) => {
    const dir = filePath.replace(/\/[^/]+$/, ""); // strip filename to get directory
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
import { Logging } from "@google-cloud/logging";
const logging = new Logging();
export function getLogger(name) {
    return logging.logSync(name);
}
export function getDefaultLogger() {
    const name = process.env.npm_package_name;
    if (!name) {
        throw new Error("npm_package_name not set (use `npm start` or explicitly set env var)");
    }
    return getLogger(name);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2xvZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQVcsT0FBTyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFekQsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztBQVU5QixNQUFNLFVBQVUsU0FBUyxDQUFDLElBQVk7SUFDcEMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQy9CLENBQUM7QUFTRCxNQUFNLFVBQVUsZ0JBQWdCO0lBQzlCLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUM7SUFDMUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ1YsTUFBTSxJQUFJLEtBQUssQ0FDYixzRUFBc0UsQ0FDdkUsQ0FBQztJQUNKLENBQUM7SUFDRCxPQUFPLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN6QixDQUFDIn0=
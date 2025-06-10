import { NormalizedEventInput } from "commonTypes.js";
export declare const NYC_LOCATION_ID = "73352aef-334c-49a6-9256-0baf91d56b49";
type UpsertEventResult = 'inserted' | 'updated' | 'failed';
export declare function upsertEvent(event: NormalizedEventInput): Promise<UpsertEventResult>;
export {};
//# sourceMappingURL=upsertEvent.d.ts.map
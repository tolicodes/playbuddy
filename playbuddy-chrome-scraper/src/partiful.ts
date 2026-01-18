import { closeTab, openTab, sleep } from "./utils";

type PartifulSessionInfo = {
  userId?: string | null;
  authToken?: string | null;
  authTokenExpiresAt?: number | null;
  appCheckToken?: string | null;
  amplitudeDeviceId?: string | null;
  hasWelcomeBack?: boolean;
};

export type PartifulInvitePayload = {
  event: Record<string, unknown>;
  cohostIds?: string[];
};

export type PartifulInviteResult = {
  partifulId: string;
  url: string;
};

export type PartifulLogLevel = "info" | "warn" | "error";

type LogFn = (
  level: PartifulLogLevel,
  message: string,
  data?: Record<string, unknown>
) => void;

const PARTIFUL_EVENTS_URL = "https://partiful.com/events";
const PARTIFUL_CREATE_EVENT_URL = "https://api.partiful.com/createEvent";
const LOGIN_WAIT_TIMEOUT_MS = 45_000;
const LOGIN_POLL_MS = 1000;
const RESPONSE_BODY_LOG_LIMIT = 500;

const readPartifulSessionInfo = async (tabId: number): Promise<PartifulSessionInfo> => {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: async () => {
      const parseJson = (text: string): unknown => {
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      };
      const asRecord = (value: unknown): Record<string, unknown> | null =>
        value && typeof value === "object" ? (value as Record<string, unknown>) : null;
      const asString = (value: unknown): string | null =>
        typeof value === "string" ? value : null;
      const asNumber = (value: unknown): number | null =>
        typeof value === "number" ? value : null;

      const entries: Array<[string, string]> = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;
        const value = localStorage.getItem(key);
        if (value == null) continue;
        entries.push([key, value]);
      }

      const indexedEntries: Array<[string, string]> = [];
      if (typeof indexedDB !== "undefined") {
        const names: string[] = [];
        if (typeof indexedDB.databases === "function") {
          try {
            const databases = await indexedDB.databases();
            for (let i = 0; i < (databases?.length || 0); i += 1) {
              const db = databases[i];
              if (db && db.name) names.push(db.name);
            }
          } catch {
            // ignore
          }
        }
        if (!names.includes("firebaseLocalStorageDb")) {
          names.push("firebaseLocalStorageDb");
        }

        for (let nameIndex = 0; nameIndex < names.length; nameIndex += 1) {
          const name = names[nameIndex];
          const db = await new Promise<IDBDatabase | null>((resolve) => {
            try {
              const request = indexedDB.open(name);
              request.onerror = () => resolve(null);
              request.onsuccess = () => resolve(request.result);
              request.onupgradeneeded = () => {
                try {
                  request.transaction?.abort();
                } catch {
                  // ignore
                }
              };
            } catch {
              resolve(null);
            }
          });
          if (!db) continue;
          const stores = Array.from(db.objectStoreNames);
          for (let storeIndex = 0; storeIndex < stores.length; storeIndex += 1) {
            const storeName = stores[storeIndex];
            await new Promise<void>((resolve) => {
              let tx: IDBTransaction | undefined;
              try {
                tx = db.transaction(storeName, "readonly");
              } catch {
                resolve();
                return;
              }
              const store = tx.objectStore(storeName);
              const request = store.getAll();
              request.onsuccess = () => {
                const items = request.result || [];
                for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
                  const record = items[itemIndex] as Record<string, unknown>;
                  const key = [
                    record?.fbase_key,
                    record?.key,
                    record?.id,
                    record?.name,
                  ].find(
                    (value): value is string =>
                      typeof value === "string" && value.length > 0
                  );
                  if (!key) continue;
                  const value = record?.value ?? record?.v ?? record?.data ?? record;
                  let serialized = "";
                  if (typeof value === "string") {
                    serialized = value;
                  } else {
                    try {
                      serialized = JSON.stringify(value);
                    } catch {
                      serialized = String(value);
                    }
                  }
                  indexedEntries.push([key, serialized]);
                }
                resolve();
              };
              request.onerror = () => resolve();
            });
          }
          db.close();
        }
      }

      const combinedEntries = entries.concat(indexedEntries);
      const data: PartifulSessionInfo = {};

      const authEntry = combinedEntries.find(([key]) =>
        key.startsWith("firebase:authUser:")
      );
      if (authEntry) {
        const parsed = parseJson(authEntry[1]);
        const parsedRecord = asRecord(parsed);
        const manager =
          asRecord(parsedRecord?.stsTokenManager) ||
          asRecord(asRecord(parsedRecord?.user)?.stsTokenManager);
        data.userId =
          asString(parsedRecord?.uid) || asString(asRecord(parsedRecord?.user)?.uid);
        data.authToken =
          asString(manager?.accessToken) || asString(manager?.idToken);
        data.authTokenExpiresAt = asNumber(manager?.expirationTime);
      }

      const appCheckEntry =
        combinedEntries.find(([key]) => key.startsWith("firebase:appCheck:")) ||
        combinedEntries.find(([key]) => key.toLowerCase().includes("appcheck"));
      if (appCheckEntry) {
        const parsed = parseJson(appCheckEntry[1]);
        const parsedRecord = asRecord(parsed);
        const valueRecord = asRecord(parsedRecord?.value);
        data.appCheckToken =
          asString(parsedRecord?.token) ||
          asString(valueRecord?.token) ||
          asString(parsedRecord?.appCheckToken);
      }

      const directAmplitude =
        localStorage.getItem("amplitudeDeviceId") ||
        localStorage.getItem("amplitude_device_id");
      if (directAmplitude) {
        data.amplitudeDeviceId = directAmplitude;
      } else {
        for (let i = 0; i < combinedEntries.length; i += 1) {
          const [key, value] = combinedEntries[i];
          if (!key.toLowerCase().includes("amplitude") && !key.startsWith("amp_")) {
            continue;
          }
          const parsed = parseJson(value);
          const parsedRecord = asRecord(parsed);
          const deviceId =
            asString(parsedRecord?.deviceId) ||
            asString(parsedRecord?.device_id) ||
            asString(parsedRecord?.amplitudeDeviceId) ||
            asString(parsedRecord?.amplitude_device_id);
          if (deviceId) {
            data.amplitudeDeviceId = deviceId;
            break;
          }
        }
      }

      const bodyText = document.body?.innerText || "";
      const docText = document.documentElement?.innerText || "";
      const normalizedBody = bodyText.replace(/\s+/g, " ").toLowerCase();
      const normalizedDoc = docText.replace(/\s+/g, " ").toLowerCase();
      data.hasWelcomeBack =
        normalizedBody.includes("welcome back") ||
        normalizedDoc.includes("welcome back");

      return data;
    },
  });

  const info = results?.[0]?.result as PartifulSessionInfo | undefined;
  return info ?? {};
};

const waitForWelcomeBack = async (
  tabId: number,
  log: LogFn
): Promise<PartifulSessionInfo> => {
  const started = Date.now();
  while (Date.now() - started < LOGIN_WAIT_TIMEOUT_MS) {
    const info = await readPartifulSessionInfo(tabId);
    if (info.hasWelcomeBack) return info;
    log("info", "Waiting for Partiful login...");
    await sleep(LOGIN_POLL_MS);
  }
  throw new Error("Timed out waiting for Partiful login.");
};

export const createPartifulInvite = async (
  payload: PartifulInvitePayload,
  log: LogFn
): Promise<PartifulInviteResult> => {
  log("info", "Opening Partiful events page.");
  const tab = await openTab(PARTIFUL_EVENTS_URL);
  try {
    log("info", "Checking Partiful login state.");
    const session = await waitForWelcomeBack(tab.id!, log);

    if (!session.userId) {
      throw new Error("Partiful userId not found. Log in and try again.");
    }

    const dataPayload: Record<string, unknown> = {
      params: {
        event: payload.event,
        cohostIds: payload.cohostIds ?? [],
      },
      userId: session.userId,
    };

    if (session.amplitudeDeviceId) {
      dataPayload.amplitudeDeviceId = session.amplitudeDeviceId;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (session.authToken) headers.Authorization = `Bearer ${session.authToken}`;
    if (session.appCheckToken) headers["X-Firebase-AppCheck"] = session.appCheckToken;

    log("info", "Sending Partiful createEvent request.");
    const response = await fetch(PARTIFUL_CREATE_EVENT_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: dataPayload }),
      credentials: "include",
    });

    const bodyText = await response.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      log("error", "Partiful createEvent failed.", {
        status: response.status,
        body: bodyText.slice(0, RESPONSE_BODY_LOG_LIMIT),
      });
      throw new Error(`Partiful createEvent failed (${response.status}).`);
    }

    const parsedRecord =
      parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;
    const resultRecord =
      parsedRecord && typeof parsedRecord.result === "object"
        ? (parsedRecord.result as Record<string, unknown>)
        : null;
    const partifulIdValue = resultRecord?.data;
    const partifulId =
      typeof partifulIdValue === "string"
        ? partifulIdValue
        : typeof partifulIdValue === "number"
          ? String(partifulIdValue)
          : null;
    if (!partifulId) {
      log("error", "Missing Partiful event id in response.", {
        body: bodyText.slice(0, RESPONSE_BODY_LOG_LIMIT),
      });
      throw new Error("Missing Partiful event id in response.");
    }

    log("info", "Partiful invite created.", { partifulId });
    return {
      partifulId,
      url: `https://partiful.com/e/v/${partifulId}`,
    };
  } finally {
    try {
      await closeTab(tab);
    } catch {
      // ignore
    }
  }
};

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../config";

export type PartifulLogLevel = "info" | "warn" | "error";

export type PartifulLogEntry = {
    id: number;
    at: string;
    level: PartifulLogLevel;
    message: string;
    data?: Record<string, unknown>;
};

type LogStreamStatus = "idle" | "connecting" | "open" | "closed" | "error";

type LogStreamOptions = {
    token?: string | null;
    enabled?: boolean;
    maxEntries?: number;
    initialLogs?: PartifulLogEntry[];
};

type LogStreamState = {
    status: LogStreamStatus;
    error: string | null;
    logs: PartifulLogEntry[];
    clearLogs: () => void;
};

type FetchLogOptions = {
    enabled?: boolean;
    token?: string | null;
};

const DEFAULT_MAX_ENTRIES = 500;
const LOGS_QUERY_KEY = ["partiful-logs"];

export const useFetchPartifulLogs = (options: FetchLogOptions = {}) => {
    const { enabled = true, token } = options;
    return useQuery<PartifulLogEntry[]>({
        queryKey: LOGS_QUERY_KEY,
        queryFn: async () => {
            const response = await axios.get(`${API_BASE_URL}/partiful/logs`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            return response.data as PartifulLogEntry[];
        },
        enabled,
    });
};

const appendLogEntry = (prev: PartifulLogEntry[], next: PartifulLogEntry, maxEntries: number) => {
    if (prev.some((entry) => entry.id === next.id)) return prev;
    const merged = [...prev, next];
    if (merged.length > maxEntries) {
        merged.splice(0, merged.length - maxEntries);
    }
    return merged;
};

export const usePartifulLogStream = (options: LogStreamOptions = {}): LogStreamState => {
    const { token, enabled = true, maxEntries = DEFAULT_MAX_ENTRIES, initialLogs } = options;
    const [logs, setLogs] = useState<PartifulLogEntry[]>([]);
    const [status, setStatus] = useState<LogStreamStatus>("idle");
    const [error, setError] = useState<string | null>(null);

    const clearLogs = useMemo(
        () => () => {
            setLogs([]);
        },
        []
    );

    useEffect(() => {
        if (!initialLogs || initialLogs.length === 0) return;
        setLogs((prev) => {
            if (prev.length === 0) {
                return initialLogs.slice(-maxEntries);
            }
            const map = new Map<number, PartifulLogEntry>();
            for (const entry of prev) {
                map.set(entry.id, entry);
            }
            for (const entry of initialLogs) {
                map.set(entry.id, entry);
            }
            const merged = Array.from(map.values()).sort((a, b) => a.id - b.id);
            if (merged.length > maxEntries) {
                merged.splice(0, merged.length - maxEntries);
            }
            return merged;
        });
    }, [initialLogs, maxEntries]);

    useEffect(() => {
        if (!enabled || !token) {
            setStatus("idle");
            return;
        }

        let active = true;
        const controller = new AbortController();

        const connect = async () => {
            setStatus("connecting");
            setError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/partiful/logs/stream`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal,
                });
                if (!response.ok || !response.body) {
                    throw new Error(`Failed to open Partiful log stream (${response.status}).`);
                }

                setStatus("open");
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                while (active) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });

                    const frames = buffer.split("\n\n");
                    buffer = frames.pop() || "";
                    for (const frame of frames) {
                        const dataLine = frame
                            .split("\n")
                            .find((line) => line.startsWith("data:"));
                        if (!dataLine) continue;
                        const json = dataLine.replace(/^data:\s*/, "").trim();
                        try {
                            const entry = JSON.parse(json) as PartifulLogEntry;
                            setLogs((prev) => appendLogEntry(prev, entry, maxEntries));
                        } catch {
                            // Ignore malformed log payloads.
                        }
                    }
                }

                if (active) {
                    setStatus("closed");
                }
            } catch (err) {
                if (!active) return;
                setStatus("error");
                setError(err instanceof Error ? err.message : String(err));
            }
        };

        connect();

        return () => {
            active = false;
            controller.abort();
            setStatus("closed");
        };
    }, [enabled, token, maxEntries]);

    return { status, error, logs, clearLogs };
};

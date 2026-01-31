const allowedHostPatterns = [/localhost/i, /127\.0\.0\.1/, /0\.0\.0\.0/, /playbuddy/i];
const hostname = window.location.hostname;
const isAllowedHost = allowedHostPatterns.some((pattern) => pattern.test(hostname));

const postToPage = (payload: unknown) => {
  window.postMessage(payload, window.location.origin);
};

let partifulPort: chrome.runtime.Port | null = null;

const connectPartifulPort = () => {
  if (partifulPort) return partifulPort;
  try {
    const port = chrome.runtime.connect({ name: "partiful" });
    port.onMessage.addListener((msg) => {
      if (!msg || typeof msg !== "object") return;
      if (msg.action === "partifulLog") {
        postToPage({
          type: "pb-partiful-log",
          requestId: msg.requestId,
          level: msg.level,
          message: msg.message,
          data: msg.data,
        });
        return;
      }
      if (msg.action === "partifulResponse") {
        postToPage({
          type: "pb-partiful-response",
          requestId: msg.requestId,
          ok: msg.ok,
          result: msg.result,
          error: msg.error,
        });
      }
    });
    port.onDisconnect.addListener(() => {
      partifulPort = null;
    });
    partifulPort = port;
  } catch {
    partifulPort = null;
  }
  return partifulPort;
};

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.origin !== window.location.origin) return;
  const data = event.data as
    | {
        type: "pb-partiful-request";
        requestId: string;
        payload?: unknown;
      }
    | { type: "pb-partiful-ping"; requestId: string }
    | undefined;

  if (!data || typeof data !== "object") return;

  if (data.type === "pb-partiful-ping") {
    postToPage({
      type: "pb-partiful-pong",
      requestId: data.requestId,
      allowed: isAllowedHost,
      host: hostname,
    });
    return;
  }

  if (data.type === "pb-partiful-request") {
    if (!isAllowedHost) {
      postToPage({
        type: "pb-partiful-response",
        requestId: data.requestId,
        ok: false,
        error: `Host ${hostname || "unknown"} is not allowlisted.`,
      });
      return;
    }

    const port = connectPartifulPort();
    if (!port) {
      postToPage({
        type: "pb-partiful-response",
        requestId: data.requestId,
        ok: false,
        error: "Failed to connect to the extension background.",
      });
      return;
    }
    try {
      port.postMessage({
        action: "partifulCreateInvite",
        requestId: data.requestId,
        payload: data.payload,
      });
    } catch (err) {
      postToPage({
        type: "pb-partiful-response",
        requestId: data.requestId,
        ok: false,
        error: err instanceof Error ? err.message : "Failed to send request.",
      });
    }
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || typeof msg !== "object") return;
  if (!isAllowedHost) return;
  if (msg.action === "partifulLog") {
    postToPage({
      type: "pb-partiful-log",
      requestId: msg.requestId,
      level: msg.level,
      message: msg.message,
      data: msg.data,
    });
    return;
  }
  if (msg.action === "partifulResponse") {
    postToPage({
      type: "pb-partiful-response",
      requestId: msg.requestId,
      ok: msg.ok,
      result: msg.result,
      error: msg.error,
    });
  }
});

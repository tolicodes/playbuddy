const allowedHostPatterns = [/localhost/i, /127\.0\.0\.1/, /0\.0\.0\.0/, /playbuddy/i];
const hostname = window.location.hostname;
const isAllowedHost = allowedHostPatterns.some((pattern) => pattern.test(hostname));

const postToPage = (payload: unknown) => {
  window.postMessage(payload, window.location.origin);
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

    chrome.runtime.sendMessage(
      {
        action: "partifulCreateInvite",
        requestId: data.requestId,
        payload: data.payload,
      },
      (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          postToPage({
            type: "pb-partiful-response",
            requestId: data.requestId,
            ok: false,
            error: lastError.message,
          });
          return;
        }
        postToPage({
          type: "pb-partiful-response",
          requestId: data.requestId,
          ...(response || { ok: false, error: "No response from extension." }),
        });
      }
    );
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || typeof msg !== "object") return;
  if (msg.action !== "partifulLog") return;
  if (!isAllowedHost) return;
  postToPage({
    type: "pb-partiful-log",
    requestId: msg.requestId,
    level: msg.level,
    message: msg.message,
    data: msg.data,
  });
});

const memCache = new Map();
const inFlight = new Map();

const lastCallAtByHost = new Map();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getLocalCache(url) {
  try {
    const raw = localStorage.getItem(`cache:${url}`);
    if (!raw) return null;
    const { data, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) return null;
    return data;
  } catch {
    return null;
  }
}
function setLocalCache(url, data, ttlMs) {
  try {
    localStorage.setItem(
      `cache:${url}`,
      JSON.stringify({ data, expiresAt: Date.now() + ttlMs })
    );
  } catch {}
}

async function readBodySafely(res) {
  const ct = res.headers.get("content-type") || "";
  const len = res.headers.get("content-length");
  if (res.status === 204) return { kind: "empty", value: "" };

  let text = "";
  try {
    text = await res.text();
  } catch {
    text = "";
  }

  if (!text || (len && String(len) === "0"))
    return { kind: "empty", value: "" };

  if (ct.toLowerCase().includes("application/json")) {
    try {
      return { kind: "json", value: JSON.parse(text) };
    } catch {}
  }
  try {
    return { kind: "json", value: JSON.parse(text) };
  } catch {
    return { kind: "text", value: text };
  }
}

export async function fetchJsonLimited(
  url,
  {
    ttlMs = 60_000,
    minGapMs = 1200,
    retries = 3,
    init = {},
    defaultOnEmpty = undefined,
  } = {}
) {
  const now = Date.now();
  const m = memCache.get(url);
  if (m && m.expiresAt > now) return m.data;
  const ls = typeof window !== "undefined" ? getLocalCache(url) : null;
  if (ls) {
    memCache.set(url, { data: ls, expiresAt: now + 5_000 });
    return ls;
  }
  if (inFlight.has(url)) return inFlight.get(url);

  const doFetch = (async () => {
    if (minGapMs > 0) {
      let hostKey = "default";
      try {
        const u = new URL(url, typeof window !== "undefined" ? window.location.href : "http://localhost");
        hostKey = u.host || "default";
      } catch {
      }

      const last = lastCallAtByHost.get(hostKey) || 0;
      const elapsed = Date.now() - last;
      if (elapsed < minGapMs) {
        await sleep(minGapMs - elapsed);
      }
      lastCallAtByHost.set(hostKey, Date.now());
    }
    let attempt = 0;
    while (true) {
      try {
        const res = await fetch(url, {
          cache: "no-store",
          headers: { Accept: "application/json, text/plain;q=0.6, */*;q=0.1" },
          ...init,
        });

        if (res.status === 429) {
          attempt += 1;
          if (attempt > retries)
            throw new Error(`429 after ${retries} retries`);
          const retryAfter = parseInt(res.headers.get("retry-after") || "0", 10);
          const backoff =
            retryAfter > 0
              ? retryAfter * 1000
              : 2000 * attempt + Math.floor(Math.random() * 500);
          await sleep(backoff);
          continue;
        }

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${url}\n${body.slice(0, 200)}`);
        }

        const body = await readBodySafely(res);

        if (body.kind === "empty") {
          attempt += 1;
          if (attempt > retries) {
            if (typeof defaultOnEmpty !== "undefined") {
              const data = defaultOnEmpty;
              const expiresAt = Date.now() + Math.min(ttlMs, 120_000);
              memCache.set(url, { data, expiresAt });
              if (typeof window !== "undefined")
                setLocalCache(url, data, Math.min(ttlMs, 120_000));
              return data;
            }
            throw new Error(`Empty body from ${url}`);
          }
          await sleep(600 * attempt + Math.floor(Math.random() * 400));
          continue;
        }

        if (body.kind !== "json") {
          attempt += 1;
          if (attempt > retries) {
            if (typeof defaultOnEmpty !== "undefined") {
              const data = defaultOnEmpty;
              const expiresAt = Date.now() + Math.min(ttlMs, 120_000);
              memCache.set(url, { data, expiresAt });
              if (typeof window !== "undefined")
                setLocalCache(url, data, Math.min(ttlMs, 120_000));
              return data;
            }
            throw new Error(
              `Non-JSON response from ${url}\n${String(body.value).slice(0, 200)}`
            );
          }
          await sleep(600 * attempt + Math.floor(Math.random() * 400));
          continue;
        }

        const data = body.value;
        const expiresAt = Date.now() + ttlMs;
        memCache.set(url, { data, expiresAt });
        if (typeof window !== "undefined") setLocalCache(url, data, ttlMs);
        return data;
      } catch (e) {
        attempt += 1;
        if (attempt > retries) throw e;
        await sleep(800 * attempt + Math.floor(Math.random() * 400));
      }
    }
  })();

  inFlight.set(url, doFetch);
  try {
    return await doFetch;
  } finally {
    inFlight.delete(url);
  }
}

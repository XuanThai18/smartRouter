/**
 * SmartRoute — Client-side Fetch Helper
 * Unwrap response format { ok: true, data: T } từ API.
 * Tương thích ngược: nếu response không có wrapper thì trả về thẳng.
 */
export async function fetchApi<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, options);
  const json = await res.json();

  if (!res.ok) {
    const msg = json?.error ?? json?.data?.error ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // Unwrap { ok: true, data: T } wrapper nếu có
  return ("data" in json ? json.data : json) as T;
}

/** Shorthand cho POST với JSON body */
export async function postApi<T = unknown>(
  url: string,
  body: unknown
): Promise<T> {
  return fetchApi<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Shorthand cho PUT với JSON body */
export async function putApi<T = unknown>(
  url: string,
  body: unknown
): Promise<T> {
  return fetchApi<T>(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Shorthand cho DELETE */
export async function deleteApi<T = unknown>(url: string): Promise<T> {
  return fetchApi<T>(url, { method: "DELETE" });
}

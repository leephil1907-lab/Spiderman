// All API calls go through here: same-origin, cookie session, CSRF header.
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'x-bnd': '1', ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = {}
  try { data = await res.json() } catch { /* empty */ }
  if (!res.ok) {
    const err = new Error(data.error || `Something went wrong (${res.status}).`)
    Object.assign(err, { status: res.status, field: data.field, needs: data.needs })
    throw err
  }
  return data
}

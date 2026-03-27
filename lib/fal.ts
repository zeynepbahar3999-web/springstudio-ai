/**
 * fal.ai API Layer — Queue-based (works for ALL 1220 modules)
 * 
 * Key fix: fal.ai returns response_url and status_url on submit.
 * We use THOSE URLs directly instead of constructing our own.
 * This fixes 405 Method Not Allowed errors.
 */

const FAL_KEY = process.env.FAL_KEY || ''

const authHeaders = {
  'Authorization': `Key ${FAL_KEY}`,
  'Content-Type': 'application/json',
}

// ─── 1. Submit to Queue ─────────────────────────────
// Returns request_id + the exact URLs fal.ai wants us to use
export async function submitQueue(
  endpoint: string,
  input: Record<string, any>
): Promise<{
  request_id: string
  status_url: string
  response_url: string
  status: string
}> {
  const url = `https://queue.fal.run/${endpoint}`
  console.log(`[fal:submit] POST ${url}`)

  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`[fal:submit] Error ${res.status}:`, err)
    throw new Error(`fal.ai submit error ${res.status}: ${err}`)
  }

  const data = await res.json()
  console.log(`[fal:submit] request_id=${data.request_id}`)
  console.log(`[fal:submit] status_url=${data.status_url}`)
  console.log(`[fal:submit] response_url=${data.response_url}`)

  return {
    request_id: data.request_id,
    status_url: data.status_url || '',
    response_url: data.response_url || '',
    status: data.status || 'IN_QUEUE',
  }
}

// ─── 2. Check Status (using fal.ai's own URL) ──────
export async function checkStatusUrl(statusUrl: string): Promise<{ status: string; logs?: any[] }> {
  console.log(`[fal:status] GET ${statusUrl}`)

  const res = await fetch(statusUrl, {
    method: 'GET',
    headers: { 'Authorization': `Key ${FAL_KEY}` },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Status check failed ${res.status}: ${err}`)
  }

  return await res.json()
}

// ─── 3. Get Result (using fal.ai's own URL) ────────
export async function getResultUrl(responseUrl: string): Promise<any> {
  console.log(`[fal:result] GET ${responseUrl}`)

  const res = await fetch(responseUrl, {
    method: 'GET',
    headers: { 'Authorization': `Key ${FAL_KEY}` },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Get result failed ${res.status}: ${err}`)
  }

  return await res.json()
}

// ─── 4. Upload File to fal.ai Storage ───────────────
export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const res = await fetch('https://rest.alpha.fal.ai/storage/upload', {
    method: 'PUT',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': contentType,
      'X-File-Name': fileName,
    },
    body: fileBuffer,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Upload failed ${res.status}: ${err}`)
  }

  const data = await res.json()
  console.log(`[fal:upload] ${fileName} → ${data.url}`)
  return data.url
}

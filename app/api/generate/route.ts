import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { submitQueue } from '@/lib/fal'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { endpoint, input } = await req.json()

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })
    }

    // Submit to fal.ai queue — returns request_id + URLs
    const queueResult = await submitQueue(endpoint, input || {})

    return NextResponse.json({
      request_id: queueResult.request_id,
      status_url: queueResult.status_url,
      response_url: queueResult.response_url,
      status: queueResult.status,
      endpoint,
    })
  } catch (err: any) {
    console.error('[generate] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}

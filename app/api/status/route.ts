import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { checkStatusUrl, getResultUrl } from '@/lib/fal'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { status_url, response_url } = await req.json()

    if (!status_url || !response_url) {
      return NextResponse.json({ error: 'status_url and response_url required' }, { status: 400 })
    }

    // Strategy: Try to fetch the result FIRST using fal.ai's response_url.
    // If job is done → we get data immediately.
    // If not done → fal.ai returns an error, we fall back to status check.

    try {
      const result = await getResultUrl(response_url)

      // Check if this is actual result data (not a status response)
      if (result && typeof result === 'object') {
        // If result has a 'status' field that says still processing, it's not done
        if (result.status === 'IN_QUEUE' || result.status === 'IN_PROGRESS') {
          console.log(`[status] → ${result.status} (from response_url)`)
          return NextResponse.json({ status: result.status })
        }

        // Otherwise we have actual data — check if it has any content
        const keys = Object.keys(result)
        if (keys.length > 0 && !keys.every(k => k === 'status')) {
          console.log(`[status] → COMPLETED (keys: ${keys.join(',')})`)
          return NextResponse.json({ status: 'COMPLETED', result })
        }
      }
    } catch (resultErr: any) {
      // Result not ready — this is expected for in-progress jobs
      console.log(`[status] response_url not ready: ${resultErr.message?.slice(0, 100)}`)
    }

    // Fallback: Check status using fal.ai's status_url
    try {
      const statusData = await checkStatusUrl(status_url)
      console.log(`[status] → ${statusData.status} (from status_url)`)

      if (statusData.status === 'COMPLETED') {
        // Status says done — now fetch the result
        try {
          const result = await getResultUrl(response_url)
          return NextResponse.json({ status: 'COMPLETED', result })
        } catch {
          // Weird edge case: status says done but can't get result
          return NextResponse.json({ status: 'IN_PROGRESS' })
        }
      }

      if (statusData.status === 'FAILED') {
        return NextResponse.json({ status: 'FAILED', error: 'Generation failed on fal.ai' })
      }

      return NextResponse.json({ status: statusData.status || 'IN_PROGRESS' })
    } catch (statusErr: any) {
      console.log(`[status] status_url failed: ${statusErr.message?.slice(0, 100)}`)
      return NextResponse.json({ status: 'IN_PROGRESS' })
    }

  } catch (err: any) {
    console.error('[status] Error:', err.message)
    return NextResponse.json({ status: 'IN_PROGRESS' })
  }
}

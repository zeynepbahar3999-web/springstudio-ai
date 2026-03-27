import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'

/**
 * File upload handler — converts file to base64 data URI.
 * fal.ai accepts data URIs directly as input (e.g. image_url, video_url).
 * No need for external storage — just encode and pass through.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })
    }

    // Convert to base64 data URI
    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')
    const mimeType = file.type || 'application/octet-stream'
    const dataUri = `data:${mimeType};base64,${base64}`

    console.log(`[upload] ${file.name} (${(file.size / 1024).toFixed(1)} KB) → data URI ready`)

    return NextResponse.json({
      url: dataUri,
      name: file.name,
      size: file.size,
    })
  } catch (err: any) {
    console.error('[upload] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}

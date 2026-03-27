'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'

// ─── Types ─────────────────────────────────────────
interface ModuleConfig {
  name: string; endpoint: string; category: string; subtitle: string
  price_api: number; input_type: string; sample_prompt: string
  has_image_size: boolean; has_negative_prompt: boolean
  sliders?: { key: string; label: string; min: number; max: number; default: number; step: number; tip: string }[]
  options?: { key: string; label: string; options: string[]; default: string }[]
  url_fields?: { key: string; label: string; required: boolean; tip: string; sample?: string }[]
  features?: string[]
}

interface Modules { [id: string]: ModuleConfig }

const CAT_MAP: Record<string, string> = {
  'text-to-image':'Text to Image',
  'image-to-image':'Image to Image',
  'image-to-video':'Image to Video',
  'text-to-video':'Text to Video',
  'video-to-video':'Video to Video',
  'image-to-3d':'Image to 3D',
  'text-to-3d':'Text to 3D',
  '3d-to-3d':'3D to 3D',
  'text-to-audio':'Text to Audio',
  'text-to-speech':'Text to Speech',
  'audio-to-audio':'Audio to Audio',
  'audio-to-video':'Audio to Video',
  'audio-to-text':'Audio to Text',
  'speech-to-text':'Speech to Text',
  'vision':'Vision',
  'llm':'LLM',
  'image-to-text':'Image to Text',
  'json':'JSON Output',
  'text-to-json':'Text to JSON',
  'training':'Training',
  'audio':'Audio Processing',
  'speech-to-speech':'Speech to Speech',
  'video':'Video Processing',
  'video-to-text':'Video to Text',
}

// ─── Main App ──────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [modules, setModules] = useState<Modules>({})
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/generate', { method: 'POST', headers: {'Content-Type':'application/json'}, body: '{}' })
      .then(r => { setAuthed(r.status !== 401) })
      .catch(() => setAuthed(false))
      .finally(() => setChecking(false))
  }, [])

  useEffect(() => {
    fetch('/data/modules.json')
      .then(r => r.json())
      .then(data => setModules(data))
      .catch(err => console.error('Failed to load modules:', err))
  }, [])

  if (checking) return <Loading />
  if (!authed) return <LoginScreen onSuccess={() => setAuthed(true)} />
  if (selected && modules[selected]) {
    return <ModuleView id={selected} config={modules[selected]} onBack={() => setSelected(null)} onLogout={() => { fetch('/api/auth', { method: 'DELETE' }); setAuthed(false) }} />
  }
  return <ModuleBrowser modules={modules} onSelect={setSelected} onLogout={() => { fetch('/api/auth', { method: 'DELETE' }); setAuthed(false) }} />
}

// ─── Loading ───────────────────────────────────────
function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-s-cyan border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ─── Login Screen ──────────────────────────────────
function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const r = await fetch('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      if (r.ok) onSuccess()
      else { const data = await r.json(); setError(data.error || 'Invalid code') }
    } catch { setError('Connection error') }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass rounded-2xl p-10 w-full max-w-md text-center">
        <h1 className="font-[Syne] text-3xl font-extrabold mb-2">
          <span className="grad">Spring</span>Studio
        </h1>
        <p className="text-sm text-s-muted mb-8">Enter your invite code to access the AI creation suite</p>
        <div className="space-y-4">
          <input type="text" value={code} onChange={e => setCode(e.target.value)}
            placeholder="Invite code"
            className="w-full px-4 py-3 rounded-xl bg-s-bg2 border border-s-border text-white placeholder:text-s-dim font-[DM_Mono] text-sm focus:outline-none focus:border-s-cyan/40 transition-colors"
            onKeyDown={e => e.key === 'Enter' && handleLogin(e)} autoFocus />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button onClick={handleLogin as any} disabled={loading || !code.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-s-cyan to-s-blue text-black font-semibold text-sm disabled:opacity-40 transition-all hover:opacity-90">
            {loading ? 'Checking...' : 'Enter Studio →'}
          </button>
        </div>
        <p className="mt-8 text-xs text-s-dim">
          Don&apos;t have a code? <a href="https://springstudio.ai" className="text-s-cyan hover:underline">Request access</a>
        </p>
      </div>
    </div>
  )
}

// ─── Module Browser ────────────────────────────────
function ModuleBrowser({ modules, onSelect, onLogout }: { modules: Modules; onSelect: (id: string) => void; onLogout: () => void }) {
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const PER_PAGE = 60

  const moduleList = useMemo(() => Object.entries(modules), [modules])

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const [, cfg] of moduleList) {
      const mc = CAT_MAP[cfg.category] || cfg.category
      counts[mc] = (counts[mc] || 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [moduleList])

  const filtered = useMemo(() => {
    let mods = moduleList
    if (activeCat) mods = mods.filter(([, c]) => (CAT_MAP[c.category] || c.category) === activeCat)
    if (search.trim()) {
      const q = search.toLowerCase()
      mods = mods.filter(([id, c]) => c.name.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q) || c.endpoint.toLowerCase().includes(q) || id.includes(q))
    }
    return mods.sort((a, b) => a[1].name.localeCompare(b[1].name))
  }, [moduleList, activeCat, search])

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-s-border sticky top-0 h-screen overflow-y-auto py-6">
        <div className="px-5 mb-6">
          <h1 className="font-[Syne] text-xl font-extrabold"><span className="grad">Spring</span>Studio</h1>
        </div>
        <div className="px-3">
          <button onClick={() => { setActiveCat(null); setPage(1) }}
            className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-sm mb-1 transition-all ${!activeCat ? 'bg-s-cyan/10 text-s-cyan font-medium' : 'text-s-muted hover:text-white hover:bg-white/[0.03]'}`}>
            <span>All Models</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-s-cyan/15 text-s-cyan">{moduleList.length}</span>
          </button>
          <div className="h-px bg-s-border my-3" />
          {catCounts.map(([cat, count]) => (
            <button key={cat} onClick={() => { setActiveCat(cat); setPage(1) }}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-sm mb-0.5 transition-all ${activeCat === cat ? 'bg-s-cyan/10 text-s-cyan font-medium' : 'text-s-muted hover:text-white hover:bg-white/[0.03]'}`}>
              <span className="truncate">{cat}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-s-muted shrink-0 ml-2">{count}</span>
            </button>
          ))}
        </div>
        <div className="px-5 mt-8">
          <button onClick={onLogout} className="text-xs text-s-dim hover:text-red-400 transition-colors">Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6">
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-s-muted text-sm">🔍</span>
            <input type="text" placeholder={`Search ${moduleList.length} modules...`} value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-s-bg2 border border-s-border text-white placeholder:text-s-dim text-sm focus:outline-none focus:border-s-cyan/40" />
          </div>
          <span className="text-xs text-s-muted self-center whitespace-nowrap"><b className="text-s-cyan">{filtered.length}</b> results</span>
        </div>

        {/* Mobile cat chips */}
        <div className="lg:hidden flex gap-2 overflow-x-auto pb-3 mb-4">
          <button onClick={() => { setActiveCat(null); setPage(1) }} className={`shrink-0 px-3 py-1.5 rounded-full text-xs ${!activeCat ? 'bg-s-cyan text-black font-medium' : 'bg-s-bg3 border border-s-border text-s-muted'}`}>
            All ({moduleList.length})
          </button>
          {catCounts.slice(0, 10).map(([cat, count]) => (
            <button key={cat} onClick={() => { setActiveCat(cat); setPage(1) }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs ${activeCat === cat ? 'bg-s-cyan text-black font-medium' : 'bg-s-bg3 border border-s-border text-s-muted'}`}>
              {cat} ({count})
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
          {paginated.map(([id, cfg]) => (
            <button key={id} onClick={() => onSelect(id)}
              className="glass rounded-xl p-5 text-left hover:border-s-cyan/20 transition-all group">
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-[Syne] text-sm font-bold text-white group-hover:text-s-cyan transition-colors leading-tight">{cfg.name}</h3>
                {cfg.price_api === 0 && <span className="text-[10px] px-2 py-0.5 rounded bg-s-cyan/10 text-s-cyan font-bold shrink-0">FREE</span>}
              </div>
              <p className="text-[11px] text-s-dim uppercase tracking-wider mt-1">{CAT_MAP[cfg.category] || cfg.category}</p>
              <p className="text-xs text-s-muted mt-2 line-clamp-2 leading-relaxed">{cfg.subtitle}</p>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-s-border">
                <span className="font-[Syne] text-base font-bold text-s-cyan">
                  {cfg.price_api === 0 ? 'Free' : `$${cfg.price_api < 0.01 ? cfg.price_api.toFixed(4) : cfg.price_api < 1 ? cfg.price_api.toFixed(3) : cfg.price_api.toFixed(2)}`}
                </span>
                <span className="text-xs text-s-cyan font-medium opacity-0 group-hover:opacity-100 transition-opacity">Open →</span>
              </div>
            </button>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex gap-2 justify-center mt-8">
            {page > 1 && <button onClick={() => setPage(p => p - 1)} className="px-3 py-2 rounded-lg bg-s-bg2 border border-s-border text-xs text-s-muted hover:text-white">← Prev</button>}
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = page <= 4 ? i + 1 : Math.min(page - 3 + i, totalPages)
              return p > 0 && p <= totalPages ? (
                <button key={p} onClick={() => setPage(p)} className={`w-9 h-9 rounded-lg text-xs ${page === p ? 'bg-s-cyan text-black font-bold' : 'bg-s-bg2 border border-s-border text-s-muted hover:text-white'}`}>{p}</button>
              ) : null
            })}
            {page < totalPages && <button onClick={() => setPage(p => p + 1)} className="px-3 py-2 rounded-lg bg-s-bg2 border border-s-border text-xs text-s-muted hover:text-white">Next →</button>}
          </div>
        )}
      </main>
    </div>
  )
}

// ─── File Upload Component ─────────────────────────
function FileUploadField({
  label, fieldKey, tip, onUrlReady
}: {
  label: string; fieldKey: string; tip?: string
  onUrlReady: (key: string, url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true); setError(''); setFileName(file.name)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }
      const data = await res.json()
      onUrlReady(fieldKey, data.url)
    } catch (err: any) {
      setError(err.message)
      setFileName('')
    }
    setUploading(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      <label className="text-[10px] font-[DM_Mono] text-s-dim uppercase tracking-widest block mb-1">{label}</label>
      {tip && <p className="text-[10px] text-s-dim mb-2">{tip}</p>}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-s-border rounded-xl p-4 text-center cursor-pointer hover:border-s-cyan/30 transition-colors"
      >
        <input ref={inputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-s-muted text-xs">
            <span className="w-4 h-4 border-2 border-s-cyan border-t-transparent rounded-full animate-spin" />
            Uploading {fileName}...
          </div>
        ) : fileName ? (
          <p className="text-xs text-s-cyan">✓ {fileName}</p>
        ) : (
          <p className="text-xs text-s-dim">Drop file here or click to browse</p>
        )}
      </div>
      {error && <p className="text-red-400 text-[10px] mt-1">{error}</p>}
    </div>
  )
}

// ─── Module View (Generate UI) ─────────────────────
function ModuleView({ id, config, onBack, onLogout }: { id: string; config: ModuleConfig; onBack: () => void; onLogout: () => void }) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  // Init form defaults
  useEffect(() => {
    const defaults: Record<string, any> = {}
    defaults.prompt = config.sample_prompt || ''
    if (config.has_negative_prompt) defaults.negative_prompt = ''
    config.sliders?.forEach(s => { defaults[s.key] = s.default })
    config.options?.forEach(o => { defaults[o.key] = o.default })
    config.url_fields?.forEach(u => { defaults[u.key] = u.sample || '' })
    setFormData(defaults)
    setResult(null); setError(''); setStatus(''); setElapsed(0)
  }, [id, config])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  function updateField(key: string, value: any) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  // ─── Smart elapsed time display ───
  function formatElapsed(secs: number): string {
    if (secs < 60) return `${secs}s`
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}m ${s}s`
  }

  // ─── GENERATE → Queue + Poll ─────────────────────
  async function handleGenerate() {
    // Cleanup any existing poll
    if (pollRef.current) clearInterval(pollRef.current)
    if (timerRef.current) clearInterval(timerRef.current)

    setGenerating(true)
    setError('')
    setResult(null)
    setStatus('Submitting...')
    setElapsed(0)
    startTimeRef.current = Date.now()

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)

    try {
      // ── Build input payload ──
      const input: Record<string, any> = {}

      // Prompt — send if field has value (covers all input_types)
      if (formData.prompt?.trim()) {
        input.prompt = formData.prompt.trim()
      }

      // Negative prompt
      if (formData.negative_prompt?.trim()) {
        input.negative_prompt = formData.negative_prompt.trim()
      }

      // Primary image_url (for input_types that use it directly)
      if (['image', 'image_url', 'both', 'both_urls', 'image_urls'].includes(config.input_type)) {
        if (formData.image_url?.trim()) {
          input.image_url = formData.image_url.trim()
        }
      }

      // Sliders → always numbers
      config.sliders?.forEach(s => {
        if (formData[s.key] !== undefined && formData[s.key] !== '') {
          input[s.key] = Number(formData[s.key])
        }
      })

      // Options / Dropdowns
      config.options?.forEach(o => {
        if (formData[o.key] !== undefined && formData[o.key] !== '') {
          input[o.key] = formData[o.key]
        }
      })

      // URL fields — this covers video_url, audio_url, mesh_url, 
      // garment_image_url, reference_images, etc.
      config.url_fields?.forEach(u => {
        if (formData[u.key]?.trim()) {
          input[u.key] = formData[u.key].trim()
        }
      })

      console.log('[generate] endpoint:', config.endpoint, 'input:', input)

      // ── Submit to queue ──
      setStatus('Submitting to queue...')
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: config.endpoint, input }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Submission failed')
      }

      const data = await res.json()

      // If server returned completed result directly
      if (data.status === 'COMPLETED' && data.result) {
        setResult(data.result)
        setStatus('Done!')
        setGenerating(false)
        if (timerRef.current) clearInterval(timerRef.current)
        return
      }

      // Get the URLs fal.ai gave us — these are the CORRECT URLs to poll
      const statusUrl = data.status_url
      const responseUrl = data.response_url

      if (!statusUrl || !responseUrl) {
        throw new Error('No status_url/response_url returned from queue')
      }

      console.log('[generate] status_url:', statusUrl)
      console.log('[generate] response_url:', responseUrl)

      setStatus('In queue...')

      // ── Start polling using fal.ai's own URLs ──
      let pollCount = 0
      pollRef.current = setInterval(async () => {
        pollCount++
        try {
          const statusRes = await fetch('/api/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_url: statusUrl, response_url: responseUrl }),
          })

          const statusData = await statusRes.json()
          console.log(`[poll #${pollCount}] status:`, statusData.status)

          if (statusData.status === 'COMPLETED') {
            // Done! Show result
            if (pollRef.current) clearInterval(pollRef.current)
            if (timerRef.current) clearInterval(timerRef.current)
            setResult(statusData.result)
            setStatus('Done!')
            setGenerating(false)
          } else if (statusData.status === 'FAILED') {
            if (pollRef.current) clearInterval(pollRef.current)
            if (timerRef.current) clearInterval(timerRef.current)
            setError(statusData.error || 'Generation failed')
            setStatus('')
            setGenerating(false)
          } else {
            // Still processing
            const statusLabel = statusData.status === 'IN_QUEUE' ? 'In queue...' : 'Processing...'
            setStatus(statusLabel)
          }
        } catch (err) {
          console.warn('[poll] error, retrying...', err)
          // Don't stop polling on network glitch — just retry
        }
      }, 3000) // Poll every 3 seconds

    } catch (err: any) {
      setError(err.message)
      setStatus('')
      setGenerating(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  // ─── Cancel generation ───
  function handleCancel() {
    if (pollRef.current) clearInterval(pollRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    setGenerating(false)
    setStatus('')
    setError('Cancelled by user')
  }

  // ─── Smart input detection ───
  // Show prompt box if: input_type says so OR sample_prompt exists
  const needsPrompt = ['prompt', 'both', 'both_urls'].includes(config.input_type) ||
    (config.sample_prompt && config.sample_prompt.length > 0 && !['image_url', 'image_urls', 'video_url', 'audio_url', 'mesh_url', 'audio', 'none'].includes(config.input_type))

  // Show primary image URL if input_type says so
  const needsImageUrl = ['image', 'image_url', 'both', 'both_urls', 'image_urls'].includes(config.input_type)

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-s-bg/90 backdrop-blur-xl border-b border-s-border">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-s-muted hover:text-white text-sm transition-colors">← Back</button>
          <h1 className="font-[Syne] text-lg font-bold text-white">{config.name}</h1>
          <span className="text-[10px] text-s-dim uppercase tracking-wider">{CAT_MAP[config.category] || config.category}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-[DM_Mono] text-xs text-s-cyan">
            ${config.price_api === 0 ? 'Free' : config.price_api.toFixed(4)}/gen
          </span>
          <button onClick={onLogout} className="text-xs text-s-dim hover:text-red-400">Sign out</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ─── Left: Form ─── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Prompt */}
          {needsPrompt && (
            <div>
              <label className="text-[10px] font-[DM_Mono] text-s-dim uppercase tracking-widest block mb-2">Prompt</label>
              <textarea value={formData.prompt || ''} onChange={e => updateField('prompt', e.target.value)} rows={4}
                placeholder={config.sample_prompt || 'Enter your prompt...'}
                className="w-full px-4 py-3 rounded-xl bg-s-bg2 border border-s-border text-white text-sm placeholder:text-s-dim focus:outline-none focus:border-s-cyan/40 resize-y" />
            </div>
          )}

          {/* Negative prompt */}
          {config.has_negative_prompt && (
            <div>
              <label className="text-[10px] font-[DM_Mono] text-s-dim uppercase tracking-widest block mb-2">Negative Prompt</label>
              <input type="text" value={formData.negative_prompt || ''} onChange={e => updateField('negative_prompt', e.target.value)}
                placeholder="Things to avoid..."
                className="w-full px-4 py-2.5 rounded-xl bg-s-bg2 border border-s-border text-white text-sm placeholder:text-s-dim focus:outline-none focus:border-s-cyan/40" />
            </div>
          )}

          {/* Primary Image URL + Upload */}
          {needsImageUrl && (
            <div>
              <label className="text-[10px] font-[DM_Mono] text-s-dim uppercase tracking-widest block mb-2">Image</label>
              <div className="space-y-2">
                <input type="url" value={formData.image_url || ''} onChange={e => updateField('image_url', e.target.value)}
                  placeholder="Paste image URL or upload below"
                  className="w-full px-4 py-2.5 rounded-xl bg-s-bg2 border border-s-border text-white text-sm placeholder:text-s-dim focus:outline-none focus:border-s-cyan/40" />
                <FileUploadField label="" fieldKey="image_url" tip="Or drag & drop an image file"
                  onUrlReady={(key, url) => updateField(key, url)} />
              </div>
            </div>
          )}

          {/* URL fields — handles ALL extra inputs: video_url, audio_url, mesh_url, etc. */}
          {config.url_fields?.map(field => (
            <div key={field.key}>
              <label className="text-[10px] font-[DM_Mono] text-s-dim uppercase tracking-widest block mb-1">
                {field.label} {field.required && <span className="text-red-400">*</span>}
              </label>
              {field.tip && <p className="text-[10px] text-s-dim mb-2">{field.tip}</p>}
              <div className="space-y-2">
                <input type="text" value={formData[field.key] || ''} onChange={e => updateField(field.key, e.target.value)}
                  placeholder={field.sample || 'Paste URL or upload below'}
                  className="w-full px-4 py-2.5 rounded-xl bg-s-bg2 border border-s-border text-white text-sm placeholder:text-s-dim focus:outline-none focus:border-s-cyan/40" />
                {/* File upload for URL fields */}
                <FileUploadField label="" fieldKey={field.key} onUrlReady={(key, url) => updateField(key, url)} />
              </div>
            </div>
          ))}

          {/* Sliders */}
          {config.sliders?.map(slider => (
            <div key={slider.key}>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-[DM_Mono] text-s-dim uppercase tracking-widest">{slider.label}</label>
                <span className="text-xs font-[DM_Mono] text-s-cyan">{formData[slider.key] ?? slider.default}</span>
              </div>
              {slider.tip && <p className="text-[10px] text-s-dim mb-2">{slider.tip}</p>}
              <input type="range" min={slider.min} max={slider.max} step={slider.step}
                value={formData[slider.key] ?? slider.default}
                onChange={e => updateField(slider.key, parseFloat(e.target.value))}
                className="w-full h-1.5 bg-s-bg3 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-s-cyan [&::-webkit-slider-thumb]:cursor-pointer" />
            </div>
          ))}

          {/* Dropdowns */}
          {config.options?.map(opt => (
            <div key={opt.key}>
              <label className="text-[10px] font-[DM_Mono] text-s-dim uppercase tracking-widest block mb-2">{opt.label}</label>
              <select value={formData[opt.key] ?? opt.default} onChange={e => updateField(opt.key, e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-s-bg2 border border-s-border text-white text-sm focus:outline-none focus:border-s-cyan/40">
                {opt.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}

          {/* Generate + Cancel buttons */}
          <div className="space-y-2">
            <button onClick={handleGenerate} disabled={generating}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-s-cyan to-s-blue text-black font-[Syne] font-bold text-sm disabled:opacity-40 hover:opacity-90 transition-all">
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  {status} ({formatElapsed(elapsed)})
                </span>
              ) : (
                `Generate → $${(config.price_api * 2).toFixed(4)}`
              )}
            </button>

            {generating && (
              <button onClick={handleCancel}
                className="w-full py-2.5 rounded-xl border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-colors">
                Cancel
              </button>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}
        </div>

        {/* ─── Right: Result ─── */}
        <div className="lg:col-span-3">
          {/* Info */}
          <div className="glass rounded-xl p-5 mb-5">
            <h3 className="font-[Syne] font-bold text-sm mb-2">{config.name}</h3>
            <p className="text-sm text-s-muted mb-3">{config.subtitle}</p>
            <div className="flex gap-4 text-xs text-s-dim flex-wrap">
              <span>Endpoint: <span className="font-[DM_Mono] text-s-muted">{config.endpoint}</span></span>
              <span>API: <span className="text-s-cyan">${config.price_api}</span></span>
              <span>You pay: <span className="text-s-cyan">${(config.price_api * 2).toFixed(4)}</span></span>
              <span>Input: <span className="font-[DM_Mono] text-s-muted">{config.input_type}</span></span>
            </div>
            {config.features && (
              <div className="mt-3 pt-3 border-t border-s-border">
                {config.features.map((f, i) => (
                  <p key={i} className="text-xs text-s-dim flex items-start gap-2 mb-1">
                    <span className="text-s-cyan mt-0.5">•</span>{f}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Result display */}
          {result ? (
            <div className="glass rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-[Syne] font-bold text-sm text-s-cyan">✨ Result</h3>
                <span className="text-[10px] text-s-dim font-[DM_Mono]">{formatElapsed(elapsed)}</span>
              </div>
              <ResultDisplay result={result} category={config.category} />
            </div>
          ) : (
            <div className="glass rounded-xl p-12 text-center">
              <p className="text-s-dim text-sm">
                {generating ? (
                  <span className="flex flex-col items-center gap-3">
                    <span className="w-10 h-10 border-2 border-s-cyan border-t-transparent rounded-full animate-spin" />
                    <span>{status}</span>
                    <span className="text-[10px] text-s-dim">{formatElapsed(elapsed)} elapsed</span>
                  </span>
                ) : (
                  'Configure your settings and hit Generate'
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Deep URL Scanner ──────────────────────────────
// Recursively finds ALL URLs in any fal.ai response, regardless of key names.
// This handles all 1220 modules without knowing their exact response format.
function extractAllUrls(obj: any, depth = 0): string[] {
  if (depth > 5) return [] // prevent infinite recursion
  const urls: string[] = []

  if (typeof obj === 'string') {
    if (obj.startsWith('http://') || obj.startsWith('https://')) urls.push(obj)
  } else if (Array.isArray(obj)) {
    for (const item of obj) urls.push(...extractAllUrls(item, depth + 1))
  } else if (obj && typeof obj === 'object') {
    // Prioritize 'url' key
    if (typeof obj.url === 'string' && obj.url.startsWith('http')) {
      urls.push(obj.url)
    }
    for (const [key, val] of Object.entries(obj)) {
      if (key === 'url') continue // already handled
      urls.push(...extractAllUrls(val, depth + 1))
    }
  }
  return [...new Set(urls)] // deduplicate
}

function classifyUrl(url: string): 'image' | 'video' | 'audio' | '3d' | 'other' {
  const lower = url.toLowerCase().split('?')[0] // strip query params
  if (/\.(mp4|webm|mov|avi|mkv)$/.test(lower)) return 'video'
  if (/\.(mp3|wav|ogg|flac|aac|m4a)$/.test(lower)) return 'audio'
  if (/\.(png|jpg|jpeg|gif|webp|bmp|svg|tiff)$/.test(lower)) return 'image'
  if (/\.(glb|gltf|obj|fbx|stl|usdz|ply)$/.test(lower)) return '3d'
  // fal.ai CDN URLs without extension — guess from context
  if (lower.includes('fal.media') || lower.includes('fal-cdn')) return 'image' // default for fal CDN
  return 'other'
}

// ─── Result Display ────────────────────────────────
function ResultDisplay({ result, category }: { result: any; category: string }) {
  // ─── STEP 1: Try known keys first (fast path) ───
  const knownImages: string[] = []
  const ri = result?.images || (result?.image ? [result.image] : [])
  for (const img of ri) {
    const u = typeof img === 'string' ? img : img?.url
    if (u) knownImages.push(u)
  }

  const knownVideo = (() => {
    const v = result?.video || result?.video_url || result?.video_file
    if (!v) return null
    return typeof v === 'string' ? v : v?.url
  })()

  const knownAudio = (() => {
    const a = result?.audio || result?.audio_file || result?.audio_url
    if (!a) return null
    return typeof a === 'string' ? a : a?.url
  })()

  const knownText = result?.text || result?.transcription || result?.response ||
    (typeof result?.output === 'string' && !result?.output.startsWith('http') ? result.output : null)

  const knownMesh = (() => {
    const m = result?.mesh || result?.model_url || result?.glb_url || result?.obj_url || result?.model_mesh
    if (!m) return null
    return typeof m === 'string' ? m : m?.url
  })()

  // ─── STEP 2: Deep scan for anything missed ───
  const allUrls = extractAllUrls(result)
  const usedUrls = new Set([...knownImages, knownVideo, knownAudio, knownMesh].filter(Boolean))

  // Find URLs not already captured by known keys
  const extraVideos: string[] = []
  const extraImages: string[] = []
  const extraAudios: string[] = []
  const extra3d: string[] = []
  const extraOther: string[] = []

  for (const url of allUrls) {
    if (usedUrls.has(url)) continue
    const type = classifyUrl(url)
    if (type === 'video') extraVideos.push(url)
    else if (type === 'image') extraImages.push(url)
    else if (type === 'audio') extraAudios.push(url)
    else if (type === '3d') extra3d.push(url)
    else extraOther.push(url)
  }

  // Merge: known + extras
  const finalImages = [...knownImages, ...extraImages]
  const finalVideo = knownVideo || extraVideos[0] || null
  const finalAudio = knownAudio || extraAudios[0] || null
  const finalMesh = knownMesh || extra3d[0] || null

  // Use category hint: if it's a video category but we only found "other" URLs, treat first as video
  const isVideoCategory = ['image-to-video', 'text-to-video', 'video-to-video', 'audio-to-video'].includes(category)
  const isAudioCategory = ['text-to-audio', 'text-to-speech', 'audio-to-audio', 'speech-to-speech'].includes(category)
  const is3dCategory = ['image-to-3d', 'text-to-3d', '3d-to-3d'].includes(category)

  const videoUrl = finalVideo || (isVideoCategory && extraOther[0] ? extraOther[0] : null)
  const audioUrl = finalAudio || (isAudioCategory && extraOther[0] ? extraOther[0] : null)
  const meshUrl = finalMesh || (is3dCategory && extraOther[0] ? extraOther[0] : null)

  // Remaining uncategorized URLs (for download links)
  const remainingOther = extraOther.filter(u => u !== videoUrl && u !== audioUrl && u !== meshUrl)

  const hasAnyOutput = finalImages.length > 0 || videoUrl || audioUrl || knownText || meshUrl || remainingOther.length > 0

  return (
    <div className="space-y-4">
      {/* Images */}
      {finalImages.length > 0 && (
        <div className={`grid gap-3 ${finalImages.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {finalImages.map((url, i) => (
            <div key={i} className="rounded-xl overflow-hidden border border-s-border">
              <img src={url} alt={`Result ${i + 1}`} className="w-full h-auto" />
              <div className="p-2 flex justify-end">
                <a href={url} target="_blank" rel="noopener" className="text-[10px] text-s-cyan hover:underline">Download ↗</a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video */}
      {videoUrl && (
        <div className="rounded-xl overflow-hidden border border-s-border">
          <video src={videoUrl} controls autoPlay muted className="w-full" />
          <div className="p-2 flex justify-end">
            <a href={videoUrl} target="_blank" rel="noopener" className="text-[10px] text-s-cyan hover:underline">Download ↗</a>
          </div>
        </div>
      )}

      {/* Audio */}
      {audioUrl && (
        <div className="rounded-xl overflow-hidden border border-s-border p-4">
          <audio src={audioUrl} controls className="w-full" />
          <div className="mt-2 flex justify-end">
            <a href={audioUrl} target="_blank" rel="noopener" className="text-[10px] text-s-cyan hover:underline">Download ↗</a>
          </div>
        </div>
      )}

      {/* 3D Model */}
      {meshUrl && (
        <div className="rounded-xl border border-s-border p-4 text-center">
          <p className="text-sm text-s-muted mb-3">3D Model Generated</p>
          <a href={meshUrl} target="_blank" rel="noopener"
            className="inline-block px-4 py-2 rounded-lg bg-s-cyan/10 text-s-cyan text-sm hover:bg-s-cyan/20 transition-colors">
            Download 3D Model ↗
          </a>
        </div>
      )}

      {/* Other downloadable files */}
      {remainingOther.length > 0 && (
        <div className="rounded-xl border border-s-border p-4 space-y-2">
          <p className="text-xs text-s-dim mb-1">Output Files:</p>
          {remainingOther.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener"
              className="block px-3 py-2 rounded-lg bg-s-cyan/5 text-s-cyan text-xs hover:bg-s-cyan/10 transition-colors truncate">
              {url.split('/').pop()?.split('?')[0] || `File ${i + 1}`} ↗
            </a>
          ))}
        </div>
      )}

      {/* Text output */}
      {knownText && (
        <div className="rounded-xl bg-s-bg2 border border-s-border p-4">
          <pre className="text-sm text-s-muted whitespace-pre-wrap font-[DM_Mono]">
            {typeof knownText === 'string' ? knownText : JSON.stringify(knownText, null, 2)}
          </pre>
        </div>
      )}

      {/* Raw JSON — ALWAYS show at bottom for debugging */}
      <details className="rounded-xl bg-s-bg2 border border-s-border">
        <summary className="px-4 py-3 text-xs text-s-dim cursor-pointer hover:text-s-muted">
          {hasAnyOutput ? 'Raw API Response (click to expand)' : 'Raw API Response'}
        </summary>
        <pre className="px-4 pb-4 text-xs text-s-dim whitespace-pre-wrap font-[DM_Mono] max-h-96 overflow-y-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      </details>
    </div>
  )
}

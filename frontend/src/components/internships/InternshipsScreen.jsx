import React, { useState, useEffect, useCallback } from 'react'
import AppShell from '../layout/AppShell'
import api from '../../lib/apiClient'
import CustomSelect from '../ui/CustomSelect'

const CATEGORY_CHIPS = ['All', 'AI/ML', 'Web Dev', 'Data Science', 'DevOps', 'Security', 'Mobile', 'Design', 'Product', 'Marketing']
const STATUS_STAGES = [
  { id: 'applied', label: 'Applied', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
  { id: 'interviewing', label: 'Interviewing', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
  { id: 'offer', label: 'Offer Received', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
  { id: 'rejected', label: 'Archived / Closed', color: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' },
]

function fmtDate(dateStr) {
  if (!dateStr) return 'Recently posted'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return dateStr }
}

function InternshipDetailModal({ internship, applied, onApply, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#141A26] rounded-3xl border border-[#e0e0e0] dark:border-[#242E40] shadow-[0_32px_80px_rgba(0,0,0,0.22)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-br from-[#0066cc] to-[#0047b3] text-white rounded-t-3xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/20 border border-white/30">
              {internship.company}
            </span>
            {internship.is_remote && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400/30 text-emerald-100 border border-emerald-400/40">
                Remote-Friendly
              </span>
            )}
          </div>
          <h2 className="font-['Manrope'] font-extrabold text-2xl text-white leading-tight">{internship.title}</h2>
          <p className="text-white/80 text-sm mt-1 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {internship.location || 'Flexible Location'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5">
          {/* Highlights grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                ),
                label: 'Company',
                val: internship.company
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ),
                label: 'Duration',
                val: internship.duration || '3–6 months'
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                ),
                label: 'Compensation',
                val: internship.stipend || 'Competitive'
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ),
                label: 'Posted Date',
                val: fmtDate(internship.published_at)
              },
            ].map(item => (
              <div key={item.label} className="flex flex-col gap-1 bg-[#fafafc] dark:bg-[#0d1117] rounded-xl p-3 border border-[#f0f0f0] dark:border-[#1a2032]">
                <span className="text-[#0066cc] dark:text-[#38BDF8]">{item.icon}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#7a7a7a] dark:text-[#9CA3AF]">{item.label}</span>
                <span className="text-xs sm:text-sm font-bold text-[#1d1d1f] dark:text-white truncate">{item.val}</span>
              </div>
            ))}
          </div>

          {/* Required Skills */}
          {internship.skills_required?.length > 0 && (
            <div>
              <h3 className="font-['Manrope'] font-bold text-sm text-[#1d1d1f] dark:text-white mb-2">Key Skills & Technologies</h3>
              <div className="flex flex-wrap gap-2">
                {internship.skills_required.map((skill, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold bg-[#eaf2fc] dark:bg-[rgba(41,151,255,0.18)] text-[#0066cc] dark:text-[#38BDF8] border border-[#cfe4fb] dark:border-[rgba(41,151,255,0.3)]">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {internship.description && (
            <div>
              <h3 className="font-['Manrope'] font-bold text-sm text-[#1d1d1f] dark:text-white mb-1.5">Job Overview</h3>
              <div className="text-xs sm:text-sm text-[#6e6e73] dark:text-[#9CA3AF] leading-relaxed max-h-56 overflow-y-auto pr-2 bg-[#fcfcfd] dark:bg-[#0d1117] p-3.5 rounded-xl border border-[#f0f0f0] dark:border-[#1a2032]">
                {internship.description}
              </div>
            </div>
          )}

          {/* Action CTAs */}
          <div className="flex gap-3 pt-2">
            <a
              href={internship.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 rounded-xl bg-[#0066cc] hover:bg-[#004fa3] dark:bg-[#38BDF8] dark:hover:bg-[#0ea5e9] text-white dark:text-[#0B0E14] font-bold text-sm text-center transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              onClick={() => onApply(internship.id, internship.apply_url)}
            >
              <span>{applied ? '✓ Applied — View Posting' : 'Apply on Official Board ↗'}</span>
            </a>
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-[#e0e0e0] dark:border-[#242E40] text-[#1d1d1f] dark:text-white font-semibold text-sm hover:bg-[#f5f5f7] dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function InternshipCard({ internship, applied, onApply, onView }) {
  return (
    <div
      className="group bg-white dark:bg-[#141A26] rounded-2xl border border-[#e0e0e0] dark:border-[#242E40] p-5 shadow-sm hover:shadow-[0_8px_32px_rgba(0,102,204,0.10)] dark:hover:shadow-[0_8px_32px_rgba(56,189,248,0.08)] transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between"
      onClick={() => onView(internship)}
    >
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#0066cc] dark:text-[#38BDF8]">
                {internship.company}
              </span>
              {internship.is_remote && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                  Remote
                </span>
              )}
            </div>
            <h3 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white leading-tight group-hover:text-[#0066cc] dark:group-hover:text-[#38BDF8] transition-colors line-clamp-2">
              {internship.title}
            </h3>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#eaf2fc] dark:bg-[rgba(41,151,255,0.18)] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center flex-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          </div>
        </div>

        {/* Location & Metadata */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6e6e73] dark:text-[#9CA3AF]">
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span className="truncate max-w-[180px]">{internship.location || 'Worldwide'}</span>
          </span>
          <span>•</span>
          <span>{internship.duration || '3–6 mos'}</span>
          <span>•</span>
          <span>{fmtDate(internship.published_at)}</span>
        </div>

        {/* Skills */}
        {internship.skills_required?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {internship.skills_required.slice(0, 4).map((sk, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#fafafc] dark:bg-[#1E2638] text-[#555] dark:text-[#CBD5E1] border border-[#f0f0f0] dark:border-[#28303F]">
                {sk}
              </span>
            ))}
            {internship.skills_required.length > 4 && (
              <span className="px-1.5 py-0.5 text-[10px] text-[#7a7a7a]">+{internship.skills_required.length - 4}</span>
            )}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="mt-4 pt-3 border-t border-[#f0f0f0] dark:border-[#242E40] flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-[#1d1d1f] dark:text-white">
          {internship.stipend || 'Competitive'}
        </span>
        <a
          href={internship.apply_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => {
            e.stopPropagation()
            onApply(internship.id, internship.apply_url)
          }}
          className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
            applied
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-[#0066cc] hover:bg-[#004fa3] dark:bg-[#38BDF8] dark:hover:bg-[#0ea5e9] text-white dark:text-[#0B0E14] shadow-sm'
          }`}
        >
          <span>{applied ? '✓ Applied — View Job ↗' : 'Apply on Website ↗'}</span>
        </a>
      </div>
    </div>
  )
}

export default function InternshipsScreen() {
  const [tab, setTab] = useState('discover')
  const [internships, setInternships] = useState([])
  const [myInternships, setMyInternships] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [appliedIds, setAppliedIds] = useState(new Set())
  const [activeDetail, setActiveDetail] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadInternships = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [discoverRes, myRes] = await Promise.all([
        api.get('/api/internships'),
        api.get('/api/internships/user/mine').catch(() => ({ data: { internships: [] } }))
      ])
      setInternships(discoverRes.data.internships || [])
      const mine = myRes.data.internships || []
      setMyInternships(mine)
      setAppliedIds(new Set(mine.map(i => i.id)))
    } catch (e) {
      setError('Unable to load internships. Please verify backend connection.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadInternships() }, [loadInternships])

  const handleApply = (internshipId, applyUrl) => {
    setAppliedIds(prev => new Set([...prev, internshipId]))
    const item = internships.find(x => x.id === internshipId)
    if (item && !myInternships.some(m => m.id === internshipId)) {
      setMyInternships(prev => [...prev, { ...item, application_status: 'applied', applied_on: new Date().toISOString() }])
    }
    showToast('Redirecting to official job posting...')
    // Track in background
    api.post(`/api/internships/${internshipId}/apply`).catch(() => {})
  }

  const handleStatusChange = async (internshipId, newStatus) => {
    try {
      await api.patch(`/api/internships/${internshipId}/status?new_status=${newStatus}`)
      setMyInternships(prev => prev.map(i => i.id === internshipId ? { ...i, application_status: newStatus } : i))
      showToast(`Status updated to ${newStatus}`)
    } catch {
      showToast('Could not update status', 'error')
    }
  }

  const filtered = internships.filter(i => {
    const categoryMatch = selectedCategory === 'All' || i.categories?.some(c => c.toLowerCase().includes(selectedCategory.toLowerCase()))
    const remoteMatch = !remoteOnly || i.is_remote
    const q = searchQuery.toLowerCase()
    const searchMatch = !q || i.title.toLowerCase().includes(q) || i.company.toLowerCase().includes(q) || i.location.toLowerCase().includes(q)
    return categoryMatch && remoteMatch && searchMatch
  })

  return (
    <AppShell>
      <div className="font-['Inter',sans-serif] flex flex-col gap-8 pb-12">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-2 transition-all ${
            toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-[#0066cc] text-white dark:bg-[#38BDF8] dark:text-[#0B0E14]'
          }`}>
            <span>{toast.msg}</span>
          </div>
        )}

        {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0066cc] via-[#0052a3] to-[#003d7a] p-8 sm:p-10 text-white shadow-[0_20px_60px_rgba(0,102,204,0.25)]">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white transform translate-x-32 -translate-y-32" />
              <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white transform -translate-x-16 translate-y-16" />
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/20 border border-white/30">
                    Verified Employer API
                  </span>
                </div>
                <h1 className="font-['Manrope'] font-extrabold text-3xl sm:text-4xl leading-tight mb-2">
                  Launch Your Career with<br />Curated Internships
                </h1>
                <p className="text-white/75 text-sm sm:text-base max-w-md">
                  Live openings aggregated directly from company Greenhouse job boards (Anthropic, OpenAI, Stripe, Figma, Vercel & more).
                </p>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-3 bg-white/15 rounded-xl px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  </div>
                  <div>
                    <p className="font-bold">{internships.filter(i => i.is_remote).length} Remote-Friendly</p>
                    <p className="text-white/70 text-xs">internships available</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/15 rounded-xl px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                  </div>
                  <div>
                    <p className="font-bold">{new Set(internships.map(i => i.company)).size} Tech Companies</p>
                    <p className="text-white/70 text-xs">live greenhouse feeds</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-[#e0e0e0] dark:border-[#242E40]">
            {[
              { id: 'discover', label: 'Discover Internships', count: filtered.length },
              { id: 'mine', label: 'My Applications', count: myInternships.length },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  tab === t.id
                    ? 'border-[#0066cc] text-[#0066cc] dark:border-[#38BDF8] dark:text-[#38BDF8]'
                    : 'border-transparent text-[#7a7a7a] hover:text-[#1d1d1f] dark:hover:text-white'
                }`}
              >
                {t.label}
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/5 dark:bg-white/10 text-[#64748b] dark:text-slate-400">{t.count}</span>
              </button>
            ))}
          </div>

          {tab === 'discover' && (
            <>
              {/* Filter controls */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  {/* Search Bar */}
                  <div className="relative flex-1 max-w-md">
                    <input
                      type="text"
                      placeholder="Search title, company, or location…"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#e0e0e0] dark:border-[#242E40] bg-white dark:bg-[#141A26] text-sm text-[#1d1d1f] dark:text-white placeholder-[#888] focus:outline-none focus:border-[#0066cc] dark:focus:border-[#38BDF8]"
                    />
                    <svg className="absolute left-3 top-2.5 text-[#888]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>

                  {/* Remote Toggle with Rounded Box */}
                  <label className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-[#1d1d1f] dark:text-white cursor-pointer select-none px-3 py-2 rounded-xl border border-[#e0e0e0] dark:border-[#242E40] bg-white dark:bg-[#141A26] hover:border-[#0066cc] dark:hover:border-[#38BDF8] transition-colors shadow-xs">
                    <input
                      type="checkbox"
                      checked={remoteOnly}
                      onChange={e => setRemoteOnly(e.target.checked)}
                      className="w-4 h-4 rounded-md text-[#0066cc] border-[#d1d5db] dark:border-[#4b5563] focus:ring-0 cursor-pointer accent-[#0066cc]"
                    />
                    <span>Remote Only</span>
                  </label>
                </div>

                {/* Category Chips */}
                <div className="overflow-x-auto pb-1">
                  <div className="flex gap-2">
                    {CATEGORY_CHIPS.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`flex-none px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-[#0066cc] dark:bg-[#38BDF8] text-white dark:text-[#0B0E14] border-[#0066cc] dark:border-[#38BDF8]'
                            : 'bg-white dark:bg-[#141A26] text-[#333] dark:text-[#D1D5DB] border-[#e0e0e0] dark:border-[#242E40] hover:border-[#0066cc] dark:hover:border-[#38BDF8]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Feed Count */}
              {!loading && !error && (
                <p className="text-sm text-[#7a7a7a] dark:text-[#9CA3AF]">
                  Showing <strong className="text-[#1d1d1f] dark:text-white">{filtered.length}</strong> verified opportunities
                  {selectedCategory !== 'All' && ` in ${selectedCategory}`}
                  {remoteOnly && ' · Remote Only'}
                </p>
              )}

              {/* States */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-10 h-10 rounded-full border-4 border-[#e0e0e0] border-t-[#0066cc] animate-spin" />
                  <p className="text-sm text-[#7a7a7a] dark:text-[#9CA3AF]">Querying live Greenhouse boards in parallel…</p>
                </div>
              )}
              {error && !loading && (
                <div className="flex flex-col items-center gap-4 py-16">
                  <p className="text-[#6e6e73] dark:text-[#9CA3AF] text-sm">{error}</p>
                  <button onClick={loadInternships} className="px-4 py-2 rounded-xl bg-[#0066cc] text-white text-sm font-semibold cursor-pointer">Retry</button>
                </div>
              )}
              {!loading && !error && filtered.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-16 bg-white dark:bg-[#141A26] rounded-2xl border border-[#e0e0e0] dark:border-[#242E40]">
                  <p className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">No Internships Found</p>
                  <p className="text-xs sm:text-sm text-[#7a7a7a] dark:text-[#9CA3AF] text-center max-w-sm">
                    No internship openings match your active filter and search criteria.
                  </p>
                  <button onClick={() => { setSelectedCategory('All'); setRemoteOnly(false); setSearchQuery('') }} className="mt-2 text-xs font-bold text-[#0066cc] dark:text-[#38BDF8] cursor-pointer">
                    Reset all filters
                  </button>
                </div>
              )}

              {/* Cards Grid */}
              {!loading && !error && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filtered.map(i => (
                    <InternshipCard
                      key={i.id}
                      internship={i}
                      applied={appliedIds.has(i.id)}
                      onApply={handleApply}
                      onView={setActiveDetail}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'mine' && (
            <div className="flex flex-col gap-4">
              {myInternships.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 bg-white dark:bg-[#141A26] rounded-2xl border border-[#e0e0e0] dark:border-[#242E40]">
                  <p className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">No Applications Tracked</p>
                  <p className="text-xs sm:text-sm text-[#7a7a7a] dark:text-[#9CA3AF] text-center max-w-xs">
                    Click "Apply Now" on any internship in Discover to automatically track its progress here.
                  </p>
                  <button onClick={() => setTab('discover')} className="mt-2 px-4 py-2 rounded-xl bg-[#0066cc] text-white text-xs font-bold cursor-pointer">
                    Explore Internships
                  </button>
                </div>
              ) : (
                myInternships.map(item => {
                  const currentStatus = item.application_status || 'applied'
                  const stageObj = STATUS_STAGES.find(s => s.id === currentStatus) || STATUS_STAGES[0]
                  return (
                    <div key={item.id} className="bg-white dark:bg-[#141A26] rounded-2xl border border-[#e0e0e0] dark:border-[#242E40] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                      <div className="flex flex-col gap-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold uppercase text-[#0066cc] dark:text-[#38BDF8]">{item.company}</span>
                          <h3 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">{item.title}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${stageObj.color}`}>
                            {stageObj.label}
                          </span>
                        </div>
                        <p className="text-xs text-[#7a7a7a] dark:text-[#9CA3AF]">
                          {item.location} · Tracked on {fmtDate(item.applied_on)}
                        </p>
                      </div>

                      {/* Status Pipeline Changer */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-[#7a7a7a] font-medium">Stage:</span>
                        <CustomSelect
                          value={currentStatus}
                          onChange={newStatus => handleStatusChange(item.id, newStatus)}
                          options={STATUS_STAGES.map(s => ({ value: s.id, label: s.label }))}
                          className="flex-none"
                          buttonClassName="!py-1.5 !px-3 !text-xs !rounded-xl !border-[#e0e0e0] dark:!border-[#242E40] !bg-[#fafafc] dark:!bg-[#1a2032] font-bold"
                          menuClassName="right-0 left-auto !rounded-xl"
                        />
                        <a
                          href={item.apply_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl border border-[#0066cc] dark:border-[#38BDF8] text-[#0066cc] dark:text-[#38BDF8] text-xs font-bold hover:bg-[#eaf2fc] dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          View Job ↗
                        </a>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

      {/* Modal View */}
      {activeDetail && (
        <InternshipDetailModal
          internship={activeDetail}
          applied={appliedIds.has(activeDetail.id)}
          onApply={handleApply}
          onClose={() => setActiveDetail(null)}
        />
      )}
    </AppShell>
  )
}

import React, { useState, useEffect, useCallback } from 'react'
import AppShell from '../layout/AppShell'
import api from '../../lib/apiClient'

const V = '#0066cc'
const V_SOFT = '#eaf2fc'
const V_BORDER = '#cfe4fb'

const STATUS_META = {
  upcoming:  { label: 'Upcoming',  bg: 'bg-blue-50 dark:bg-blue-900/20',   text: 'text-blue-700 dark:text-blue-300',   dot: 'bg-blue-500'  },
  ongoing:   { label: 'Ongoing',   bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  ended:     { label: 'Ended',     bg: 'bg-slate-100 dark:bg-slate-800/40', text: 'text-slate-500 dark:text-slate-400',  dot: 'bg-slate-400'  },
}

const THEME_CHIPS = ['All', 'AI/ML', 'Web3', 'FinTech', 'Blockchain', 'Open Source', 'Health', 'Social Impact', 'Security']
const STATUS_TABS = ['All', 'Upcoming', 'Ongoing', 'Ended']

function fmt(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return dateStr }
}

function HackathonDetailModal({ hackathon, registered, onRegister, onClose }) {
  const s = STATUS_META[hackathon.status] || STATUS_META.upcoming
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#141A26] rounded-3xl border border-[#e0e0e0] dark:border-[#242E40] shadow-[0_32px_80px_rgba(0,0,0,0.22)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Hero */}
        <div className="relative h-44 rounded-t-3xl overflow-hidden bg-gradient-to-br from-[#0066cc] to-[#0047b3]">
          {hackathon.image_url && (
            <img src={hackathon.image_url} alt={hackathon.name} className="absolute inset-0 w-full h-full object-cover opacity-40" />
          )}
          <div className="absolute inset-0 flex flex-col justify-end p-6">
            <span className={`self-start mb-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${s.bg} ${s.text} flex items-center gap-1.5`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
            <h2 className="font-['Manrope'] font-extrabold text-2xl text-white leading-tight">{hackathon.name}</h2>
            {hackathon.tagline && <p className="text-white/80 text-sm mt-1">{hackathon.tagline}</p>}
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5">
          {/* Key info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: '📅', label: 'Start', val: fmt(hackathon.starts_at) },
              { icon: '📅', label: 'End', val: fmt(hackathon.ends_at) },
              { icon: hackathon.is_online ? '🌐' : '📍', label: hackathon.is_online ? 'Mode' : 'Location', val: hackathon.is_online ? 'Online' : (hackathon.location || 'In-Person') },
              { icon: '👥', label: 'Team Size', val: `${hackathon.team_min || 1}–${hackathon.team_max || 4}` },
            ].map(item => (
              <div key={item.label} className="flex flex-col gap-0.5 bg-[#fafafc] dark:bg-[#0d1117] rounded-xl p-3 border border-[#f0f0f0] dark:border-[#1a2032]">
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#7a7a7a] dark:text-[#9CA3AF]">{item.label}</span>
                <span className="text-sm font-bold text-[#1d1d1f] dark:text-white">{item.val}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          {hackathon.description && (
            <div>
              <h3 className="font-['Manrope'] font-bold text-sm text-[#1d1d1f] dark:text-white mb-1.5">About this Hackathon</h3>
              <p className="text-sm text-[#6e6e73] dark:text-[#9CA3AF] leading-relaxed">{hackathon.description}</p>
            </div>
          )}

          {/* Themes */}
          {hackathon.themes?.length > 0 && (
            <div>
              <h3 className="font-['Manrope'] font-bold text-sm text-[#1d1d1f] dark:text-white mb-2">Themes</h3>
              <div className="flex flex-wrap gap-2">
                {hackathon.themes.map((t, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold bg-[#eaf2fc] dark:bg-[rgba(41,151,255,0.18)] text-[#0066cc] dark:text-[#38BDF8] border border-[#cfe4fb] dark:border-[rgba(41,151,255,0.3)]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Prizes */}
          {hackathon.prizes && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">Prize Pool</p>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">{hackathon.prizes}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <a
              href={hackathon.registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 rounded-xl bg-[#0066cc] hover:bg-[#004fa3] dark:bg-[#38BDF8] dark:hover:bg-[#0ea5e9] text-white dark:text-[#0B0E14] font-bold text-sm text-center transition-all shadow-md"
              onClick={() => !registered && onRegister(hackathon.id)}
            >
              {registered ? '✓ Registered — View on Devfolio' : '🚀 Register Now'}
            </a>
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-[#e0e0e0] dark:border-[#242E40] text-[#1d1d1f] dark:text-white font-semibold text-sm hover:bg-[#f5f5f7] dark:hover:bg-white/5 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function HackathonCard({ hackathon, registered, onRegister, onView }) {
  const s = STATUS_META[hackathon.status] || STATUS_META.upcoming
  return (
    <div
      className="group bg-white dark:bg-[#141A26] rounded-2xl border border-[#e0e0e0] dark:border-[#242E40] shadow-sm hover:shadow-[0_8px_32px_rgba(0,102,204,0.10)] dark:hover:shadow-[0_8px_32px_rgba(56,189,248,0.08)] transition-all duration-200 hover:-translate-y-0.5 overflow-hidden cursor-pointer flex flex-col"
      onClick={() => onView(hackathon)}
    >
      {/* Card image / gradient banner */}
      <div className="relative h-28 overflow-hidden flex-none bg-gradient-to-br from-[#0066cc] to-[#0047b3] dark:from-[#1a3a6e] dark:to-[#0d1f3c]">
        {hackathon.image_url && (
          <img src={hackathon.image_url} alt={hackathon.name} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-60 transition-opacity" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${s.bg} ${s.text} flex items-center gap-1`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </span>
        {hackathon.is_online && (
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white flex items-center gap-1">
            🌐 Online
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        <div>
          <h3 className="font-['Manrope'] font-extrabold text-base text-[#1d1d1f] dark:text-white leading-tight line-clamp-2 group-hover:text-[#0066cc] dark:group-hover:text-[#38BDF8] transition-colors">
            {hackathon.name}
          </h3>
          {hackathon.tagline && (
            <p className="text-xs text-[#6e6e73] dark:text-[#9CA3AF] mt-1 line-clamp-2">{hackathon.tagline}</p>
          )}
        </div>

        {/* Themes */}
        {hackathon.themes?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {hackathon.themes.slice(0, 3).map((t, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#eaf2fc] dark:bg-[rgba(41,151,255,0.15)] text-[#0066cc] dark:text-[#38BDF8]">
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Dates */}
        <div className="flex flex-col gap-1 text-xs text-[#6e6e73] dark:text-[#9CA3AF]">
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {fmt(hackathon.starts_at)} → {fmt(hackathon.ends_at)}
          </span>
          {!hackathon.is_online && hackathon.location && (
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {hackathon.location}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Team: {hackathon.team_min || 1}–{hackathon.team_max || 4} members
          </span>
        </div>

        {/* Register CTA */}
        <button
          onClick={e => { e.stopPropagation(); onRegister(hackathon.id, hackathon.registration_url) }}
          className={`w-full mt-auto py-2.5 rounded-xl font-bold text-xs transition-all ${
            registered
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-[#0066cc] hover:bg-[#004fa3] dark:bg-[#38BDF8] dark:hover:bg-[#0ea5e9] text-white dark:text-[#0B0E14] shadow-sm'
          }`}
        >
          {registered ? '✓ Registered' : 'Register Now'}
        </button>
      </div>
    </div>
  )
}

export default function HackathonsScreen() {
  const [tab, setTab] = useState('discover')
  const [hackathons, setHackathons] = useState([])
  const [myHackathons, setMyHackathons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTheme, setSelectedTheme] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [registeredIds, setRegisteredIds] = useState(new Set())
  const [activeDetail, setActiveDetail] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadHackathons = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [discoverRes, myRes] = await Promise.all([
        api.get('/api/hackathons'),
        api.get('/api/hackathons/user/mine').catch(() => ({ data: { hackathons: [] } }))
      ])
      setHackathons(discoverRes.data.hackathons || [])
      const mine = myRes.data.hackathons || []
      setMyHackathons(mine)
      setRegisteredIds(new Set(mine.map(h => h.id)))
    } catch (e) {
      setError('Unable to load hackathons. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadHackathons() }, [loadHackathons])

  const handleRegister = async (hackathonId, regUrl) => {
    if (registeredIds.has(hackathonId)) {
      if (regUrl) window.open(regUrl, '_blank', 'noopener')
      return
    }
    try {
      await api.post(`/api/hackathons/${hackathonId}/register`)
      setRegisteredIds(prev => new Set([...prev, hackathonId]))
      const h = hackathons.find(x => x.id === hackathonId)
      if (h) setMyHackathons(prev => [...prev, { ...h, user_status: 'registered' }])
      showToast('Registered successfully! 🎉')
      if (regUrl) window.open(regUrl, '_blank', 'noopener')
    } catch {
      showToast('Registration failed. Please try again.', 'error')
    }
  }

  const filtered = hackathons.filter(h => {
    const themeMatch = selectedTheme === 'All' || h.themes?.some(t => t.toLowerCase().includes(selectedTheme.toLowerCase()))
    const statusMatch = selectedStatus === 'All' || h.status === selectedStatus.toLowerCase()
    return themeMatch && statusMatch
  })

  return (
    <AppShell>
      <div className="w-full min-h-screen bg-[#F5F5F7] dark:bg-[#0B0E14] font-['Inter',sans-serif]">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-2 transition-all ${
            toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-[#0066cc] text-white dark:bg-[#38BDF8] dark:text-[#0B0E14]'
          }`}>
            {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0066cc] via-[#0052a3] to-[#003d7a] p-8 sm:p-10 text-white shadow-[0_20px_60px_rgba(0,102,204,0.25)]">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white transform translate-x-32 -translate-y-32" />
              <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white transform -translate-x-16 translate-y-16" />
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">🏆</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/20 border border-white/30">Live Data</span>
                </div>
                <h1 className="font-['Manrope'] font-extrabold text-3xl sm:text-4xl leading-tight mb-2">
                  Join the World's Best<br />Hackathons
                </h1>
                <p className="text-white/75 text-sm sm:text-base max-w-md">
                  Real-time listings from Devfolio & Devpost. Personalized to your learning path and skills.
                </p>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2 bg-white/15 rounded-xl px-4 py-3">
                  <span className="text-xl">🌐</span>
                  <div>
                    <p className="font-bold">{hackathons.filter(h => h.is_online).length} Online</p>
                    <p className="text-white/70 text-xs">hackathons available</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/15 rounded-xl px-4 py-3">
                  <span className="text-xl">🚀</span>
                  <div>
                    <p className="font-bold">{hackathons.filter(h => h.status === 'upcoming').length} Upcoming</p>
                    <p className="text-white/70 text-xs">registration open</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#e0e0e0] dark:border-[#242E40]">
            {[
              { id: 'discover', label: 'Discover Hackathons', count: filtered.length },
              { id: 'mine', label: 'My Hackathons', count: myHackathons.length },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
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
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Theme chips */}
                <div className="flex-1 overflow-x-auto">
                  <div className="flex gap-2 pb-1">
                    {THEME_CHIPS.map(theme => (
                      <button
                        key={theme}
                        onClick={() => setSelectedTheme(theme)}
                        className={`flex-none px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          selectedTheme === theme
                            ? 'bg-[#0066cc] dark:bg-[#38BDF8] text-white dark:text-[#0B0E14] border-[#0066cc] dark:border-[#38BDF8]'
                            : 'bg-white dark:bg-[#141A26] text-[#333] dark:text-[#D1D5DB] border-[#e0e0e0] dark:border-[#242E40] hover:border-[#0066cc] dark:hover:border-[#38BDF8]'
                        }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Status filter */}
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="flex-none px-3 py-1.5 rounded-xl border border-[#e0e0e0] dark:border-[#242E40] bg-white dark:bg-[#141A26] text-sm text-[#333] dark:text-white font-medium focus:outline-none focus:border-[#0066cc] dark:focus:border-[#38BDF8]"
                >
                  {STATUS_TABS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              {/* Results info */}
              {!loading && !error && (
                <p className="text-sm text-[#7a7a7a] dark:text-[#9CA3AF]">
                  Showing <strong className="text-[#1d1d1f] dark:text-white">{filtered.length}</strong> hackathons
                  {selectedTheme !== 'All' && ` tagged "${selectedTheme}"`}
                  {selectedStatus !== 'All' && ` · ${selectedStatus}`}
                </p>
              )}

              {/* States */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-10 h-10 rounded-full border-4 border-[#e0e0e0] border-t-[#0066cc] animate-spin" />
                  <p className="text-sm text-[#7a7a7a] dark:text-[#9CA3AF]">Fetching real hackathons from Devfolio & Devpost…</p>
                </div>
              )}
              {error && !loading && (
                <div className="flex flex-col items-center gap-4 py-16">
                  <span className="text-5xl">😔</span>
                  <p className="text-[#6e6e73] dark:text-[#9CA3AF] text-sm">{error}</p>
                  <button onClick={loadHackathons} className="px-4 py-2 rounded-xl bg-[#0066cc] text-white text-sm font-semibold">Retry</button>
                </div>
              )}
              {!loading && !error && filtered.length === 0 && (
                <div className="flex flex-col items-center gap-4 py-16">
                  <span className="text-5xl">🔍</span>
                  <p className="text-[#6e6e73] dark:text-[#9CA3AF] text-sm">No hackathons found for these filters.</p>
                  <button onClick={() => { setSelectedTheme('All'); setSelectedStatus('All') }} className="text-sm text-[#0066cc] dark:text-[#38BDF8] font-semibold">Clear filters</button>
                </div>
              )}

              {!loading && !error && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filtered.map(h => (
                    <HackathonCard
                      key={h.id}
                      hackathon={h}
                      registered={registeredIds.has(h.id)}
                      onRegister={(id, url) => handleRegister(id, url || h.registration_url)}
                      onView={setActiveDetail}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'mine' && (
            <div className="flex flex-col gap-4">
              {myHackathons.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-16 bg-white dark:bg-[#141A26] rounded-2xl border border-[#e0e0e0] dark:border-[#242E40]">
                  <span className="text-5xl">🏆</span>
                  <p className="font-['Manrope'] font-bold text-[#1d1d1f] dark:text-white">No hackathons yet</p>
                  <p className="text-sm text-[#7a7a7a] dark:text-[#9CA3AF] text-center max-w-xs">Register for hackathons in the Discover tab to track them here.</p>
                  <button onClick={() => setTab('discover')} className="px-4 py-2 rounded-xl bg-[#0066cc] text-white text-sm font-semibold">Discover Hackathons</button>
                </div>
              ) : (
                myHackathons.map(h => {
                  const s = STATUS_META[h.status] || STATUS_META.upcoming
                  return (
                    <div key={h.id} className="bg-white dark:bg-[#141A26] rounded-2xl border border-[#e0e0e0] dark:border-[#242E40] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm">
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-['Manrope'] font-extrabold text-base text-[#1d1d1f] dark:text-white">{h.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${s.bg} ${s.text}`}>{s.label}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">✓ {h.user_status || 'Registered'}</span>
                        </div>
                        <p className="text-xs text-[#7a7a7a] dark:text-[#9CA3AF]">{fmt(h.starts_at)} → {fmt(h.ends_at)} · {h.is_online ? '🌐 Online' : h.location}</p>
                      </div>
                      <a
                        href={h.registration_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-none px-4 py-2 rounded-xl border border-[#0066cc] dark:border-[#38BDF8] text-[#0066cc] dark:text-[#38BDF8] text-xs font-bold hover:bg-[#eaf2fc] dark:hover:bg-white/5 transition-colors"
                      >
                        View Hackathon ↗
                      </a>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {activeDetail && (
        <HackathonDetailModal
          hackathon={activeDetail}
          registered={registeredIds.has(activeDetail.id)}
          onRegister={(id) => handleRegister(id, activeDetail.registration_url)}
          onClose={() => setActiveDetail(null)}
        />
      )}
    </AppShell>
  )
}

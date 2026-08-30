import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import AppShell from '../layout/AppShell'
import api from '../../lib/apiClient'
import CustomSelect from '../ui/CustomSelect'

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

function RegisterConfirmModal({ hackathon, onConfirm, onSaveInterest, onClose }) {
  if (!hackathon) return null
  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-150" />
      <div
        className="relative z-10 w-full max-w-md bg-white dark:bg-[#121216] rounded-3xl border border-[#e0e0e0] dark:border-[#27272F] p-6 shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-zinc-800 text-[#0066cc] dark:text-[#C9D0D6] border border-blue-200 dark:border-[#27272F]">
            Registration Confirmation
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#fafafc] dark:bg-[#18181D] text-[#7a7a7a] hover:text-[#1d1d1f] dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <h3 className="font-['Manrope'] font-extrabold text-lg text-[#1d1d1f] dark:text-white leading-tight mb-2">
          Did you register for {hackathon.name}?
        </h3>
        <p className="text-xs text-[#6e6e73] dark:text-[#9CA3AF] leading-relaxed mb-6">
          We opened the official portal in a new tab. Once you complete your registration, confirm below so we can track it on your roadmap.
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => onConfirm(hackathon.id, 'registered')}
            className="w-full py-2.5 px-4 rounded-xl bg-[#0066cc] hover:bg-[#004fa3] dark:bg-[#C9D0D6] dark:hover:bg-[#CBD5E1] text-white dark:text-black dark:!text-black font-bold text-xs text-center transition-all shadow-sm cursor-pointer"
          >
            ✓ Yes, I Registered
          </button>
          <button
            type="button"
            onClick={() => onSaveInterest(hackathon.id, 'saved')}
            className="w-full py-2.5 px-4 rounded-xl border border-[#0066cc] dark:border-[#27272F] text-[#0066cc] dark:text-[#C9D0D6] font-bold text-xs text-center hover:bg-[#eaf2fc] dark:hover:bg-[#18181D] transition-colors cursor-pointer"
          >
            Save for Later
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl text-xs text-[#7a7a7a] hover:text-[#1d1d1f] dark:hover:text-white font-semibold transition-colors cursor-pointer"
          >
            Just Browsing (Don't track yet)
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}

function HackathonDetailModal({ hackathon, registered, onVisitSite, onToggleRegister, onClose }) {
  const s = STATUS_META[hackathon.status] || STATUS_META.upcoming
  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-150" />
      <div
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#121216] rounded-3xl border border-[#e0e0e0] dark:border-[#27272F] shadow-[0_32px_80px_rgba(0,0,0,0.22)] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Hero Banner */}
        <div className="relative h-44 rounded-t-3xl overflow-hidden bg-gradient-to-br from-[#0066cc] to-[#0047b3]">
          {hackathon.image_url && (
            <img
              src={hackathon.image_url}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
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
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5">
          {/* Key info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ),
                label: 'Start Date',
                val: fmt(hackathon.starts_at)
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ),
                label: 'End Date',
                val: fmt(hackathon.ends_at)
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                ),
                label: hackathon.is_online ? 'Format' : 'Location',
                val: hackathon.is_online ? 'Virtual / Online' : (hackathon.location || 'In-Person')
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                ),
                label: 'Team Size',
                val: `${hackathon.team_min || 1}–${hackathon.team_max || 4} members`
              },
            ].map(item => (
              <div key={item.label} className="flex flex-col gap-1 bg-[#fafafc] dark:bg-[#0E0E12] rounded-xl p-3 border border-[#f0f0f0] dark:border-[#27272F]">
                <span className="text-[#0066cc] dark:text-[#C9D0D6]">{item.icon}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#7a7a7a] dark:text-[#9CA3AF]">{item.label}</span>
                <span className="text-xs sm:text-sm font-bold text-[#1d1d1f] dark:text-white truncate">{item.val}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          {hackathon.description && (
            <div>
              <h3 className="font-['Manrope'] font-bold text-sm text-[#1d1d1f] dark:text-white mb-1.5">About this Hackathon</h3>
              <p className="text-xs sm:text-sm text-[#6e6e73] dark:text-[#9CA3AF] leading-relaxed">{hackathon.description}</p>
            </div>
          )}

          {/* Themes */}
          {hackathon.themes?.length > 0 && (
            <div>
              <h3 className="font-['Manrope'] font-bold text-sm text-[#1d1d1f] dark:text-white mb-2">Themes & Tracks</h3>
              <div className="flex flex-wrap gap-2">
                {hackathon.themes.map((t, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold bg-[#eaf2fc] dark:bg-[rgba(201,208,214,0.15)] text-[#0066cc] dark:text-[#C9D0D6] border border-[#cfe4fb] dark:border-[rgba(201,208,214,0.25)]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Prizes */}
          {hackathon.prizes && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#fafafc] dark:bg-[#0E0E12] border border-[#f0f0f0] dark:border-[#27272F]">
              <div className="w-8 h-8 rounded-lg bg-[#eaf2fc] dark:bg-[rgba(201,208,214,0.15)] text-[#0066cc] dark:text-[#C9D0D6] flex items-center justify-center flex-none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#7a7a7a] dark:text-[#9CA3AF]">Prize Pool & Awards</p>
                <p className="text-sm font-bold text-[#1d1d1f] dark:text-white">{hackathon.prizes}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => onVisitSite(hackathon)}
              className="flex-1 py-3 px-5 rounded-xl bg-[#0066cc] hover:bg-[#004fa3] dark:bg-[#C9D0D6] dark:hover:bg-[#CBD5E1] text-white dark:text-black dark:!text-black font-bold text-sm text-center shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="text-white dark:text-black dark:!text-black font-bold">{hackathon.status === 'ended' ? 'View Event Details ↗' : 'Register on Official Website ↗'}</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleRegister(hackathon.id, registered ? 'remove' : 'registered')}
              className={`py-3 px-5 rounded-xl border font-bold text-sm transition-colors cursor-pointer ${
                registered
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                  : 'border-[#0066cc] dark:border-[#27272F] text-[#0066cc] dark:text-[#C9D0D6] hover:bg-[#eaf2fc] dark:hover:bg-[#18181D]'
              }`}
            >
              {registered ? 'Undo Registration' : 'Mark as Registered'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-[#e0e0e0] dark:border-[#27272F] text-[#1d1d1f] dark:text-white font-semibold text-sm hover:bg-[#f5f5f7] dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}

function HackathonCard({ hackathon, registered, onVisitSite, onToggleRegister, onView }) {
  const s = STATUS_META[hackathon.status] || STATUS_META.upcoming
  return (
    <div
      className="group bg-white dark:bg-[#121216] rounded-2xl border border-[#e0e0e0] dark:border-[#27272F] shadow-sm hover:border-black/40 hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:hover:border-[#C9D0D6]/40 dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-200 hover:-translate-y-0.5 overflow-hidden cursor-pointer flex flex-col justify-between"
      onClick={() => onView(hackathon)}
    >
      <div>
        {/* Card image banner */}
        <div className="relative h-28 overflow-hidden flex-none bg-gradient-to-br from-[#0066cc] to-[#0047b3] dark:from-[#18181D] dark:to-[#09090B]">
          {hackathon.image_url && (
            <img
              src={hackathon.image_url}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
              className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-60 transition-opacity"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <span className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${s.bg} ${s.text} flex items-center gap-1.5 shadow-xs`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </span>
          {hackathon.is_online && (
            <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white flex items-center gap-1">
              Virtual
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 p-4">
          <div>
            <h3 className="font-['Manrope'] font-extrabold text-base text-[#1d1d1f] dark:text-white leading-tight line-clamp-2 group-hover:text-[#0066cc] dark:group-hover:text-[#C9D0D6] transition-colors">
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
                <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#C9D0D6]">
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Dates & Location */}
          <div className="flex flex-col gap-1 text-xs text-[#6e6e73] dark:text-[#9CA3AF]">
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {fmt(hackathon.starts_at)} → {fmt(hackathon.ends_at)}
            </span>
            {!hackathon.is_online && hackathon.location && (
              <span className="flex items-center gap-1.5 truncate">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {hackathon.location}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="p-4 pt-0 flex gap-2">
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onVisitSite(hackathon) }}
          className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer bg-[#0066cc] hover:bg-[#004fa3] dark:bg-[#C9D0D6] dark:hover:bg-[#CBD5E1] text-white dark:text-black dark:!text-black shadow-sm flex items-center justify-center gap-1"
        >
          <span className="text-white dark:text-black dark:!text-black font-bold">{hackathon.status === 'ended' ? 'View Details ↗' : 'Register on Website ↗'}</span>
        </button>
        {registered ? (
          <button
            type="button"
            title="Remove from My Hackathons"
            onClick={e => { e.stopPropagation(); onToggleRegister(hackathon.id, 'remove') }}
            className={`px-2.5 py-2.5 rounded-xl border font-bold text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/20 transition-colors cursor-pointer ${
              registered === 'registered' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : registered === 'saved' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
              : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            {registered === 'registered' ? '✓ Registered' : registered === 'saved' ? '✓ Saved' : '✓ Tracked'}
          </button>
        ) : (
          <button
            type="button"
            title="Track this hackathon without visiting"
            onClick={e => { e.stopPropagation(); onToggleRegister(hackathon.id, 'tracked') }}
            className="px-3 py-2.5 rounded-xl border border-[#e0e0e0] dark:border-[#27272F] text-[#7a7a7a] hover:text-[#0066cc] dark:hover:text-[#C9D0D6] hover:border-[#0066cc] dark:hover:border-[#C9D0D6] font-bold text-xs transition-colors cursor-pointer"
          >
            Track
          </button>
        )}
      </div>
    </div>
  )
}

const FALLBACK_HACKATHONS = [
  {
    id: "hack-devfolio-dominion-2026",
    name: "DOMINION 2026",
    tagline: "National level offline & virtual hackathon for high-impact innovation.",
    description: "Hosted on Devfolio. Developers collaborate across AI, Web, Cloud, and Automation tracks to solve real industry challenges.",
    starts_at: "2026-09-15T09:00:00Z",
    ends_at: "2026-09-16T18:00:00Z",
    location: "India / Hybrid",
    is_online: true,
    team_min: 2,
    team_max: 4,
    registration_url: "https://devfolio.co/hackathons",
    image_url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
    themes: ["AI/ML", "Web3", "Open Source", "FinTech"],
    prizes: "₹1,50,000 Prize Pool",
    status: "upcoming",
  },
  {
    id: "hack-devfolio-recursion-ii",
    name: "Recursion Edition II",
    tagline: "Solve algorithmic and real-world system architecture problems in 36 hours.",
    description: "Annual hackathon bringing over 1,000 developers together to construct scalable web and mobile solutions on top of open protocols.",
    starts_at: "2026-09-20T10:00:00Z",
    ends_at: "2026-09-21T22:00:00Z",
    location: "Online",
    is_online: true,
    team_min: 1,
    team_max: 4,
    registration_url: "https://devfolio.co/hackathons",
    image_url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
    themes: ["Open Source", "Web3", "AI/ML"],
    prizes: "₹2,00,000 in Prizes",
    status: "upcoming",
  },
  {
    id: "hack-aws-genai-2026",
    name: "AWS Generative AI Global Hackathon",
    tagline: "Build production-ready generative AI agents using Amazon Bedrock, SageMaker, and AWS Lambda.",
    description: "Create next-generation intelligent applications, RAG pipelines, or autonomous agents using Amazon Bedrock foundation models (Claude 3.5, Nova, Titan). Open to developers worldwide.",
    starts_at: "2026-09-01T00:00:00Z",
    ends_at: "2026-10-15T23:59:59Z",
    location: "Global",
    is_online: true,
    team_min: 1,
    team_max: 4,
    registration_url: "https://aws-generative-ai.devpost.com",
    image_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    themes: ["AI/ML", "Cloud", "Serverless", "GenAI"],
    prizes: "$50,000 in Cash & AWS Credits",
    status: "upcoming",
  },
  {
    id: "hack-ethglobal-singapore",
    name: "ETHGlobal Singapore & Web3 Builder Summit",
    tagline: "The premier Web3 & decentralized application hackathon in Southeast Asia.",
    description: "Build decentralized applications, zero-knowledge proofs, DeFi protocols, or account abstraction tooling alongside world-class web3 engineers and mentors.",
    starts_at: "2026-09-18T09:00:00Z",
    ends_at: "2026-09-20T18:00:00Z",
    location: "Suntec Convention Centre, Singapore",
    is_online: false,
    team_min: 1,
    team_max: 5,
    registration_url: "https://ethglobal.com/events/singapore2026",
    image_url: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=800&q=80",
    themes: ["Web3", "Blockchain", "FinTech", "Security"],
    prizes: "$125,000 Pool",
    status: "upcoming",
  },
  {
    id: "hack-hackmit-2026",
    name: "HackMIT: Tech for Global Impact",
    tagline: "MIT's flagship undergraduate hackathon bringing 1,000+ hackers to Cambridge and online.",
    description: "HackMIT brings students from around the world to build innovative software and hardware projects. Tracks include Healthcare, Climate Tech, Education, and Accessible AI.",
    starts_at: "2026-09-26T10:00:00Z",
    ends_at: "2026-09-27T17:00:00Z",
    location: "Cambridge, MA / Hybrid",
    is_online: true,
    team_min: 1,
    team_max: 4,
    registration_url: "https://hackmit.org",
    image_url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
    themes: ["AI/ML", "Health", "Social Impact", "Open Source"],
    prizes: "$35,000 Total Prizes",
    status: "upcoming",
  },
  {
    id: "hack-devfolio-pushtoprod",
    name: "Push to Prod Hackathon: Building at the Frontier",
    tagline: "Offline basecamp hackathon organized on Devfolio with Anthropic & Mistral.",
    description: "Developers built production AI architectures and deployed frontier models in a high-intensity 48-hour sprint. Submissions and judging are complete.",
    starts_at: "2026-07-10T09:00:00Z",
    ends_at: "2026-07-12T18:00:00Z",
    location: "Offline Basecamp",
    is_online: false,
    team_min: 2,
    team_max: 4,
    registration_url: "https://devfolio.co/hackathons",
    image_url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80",
    themes: ["AI/ML", "Open Source", "Cloud"],
    prizes: "$25,000 Awarded",
    status: "ended",
  },
  {
    id: "hack-huggingface-agents",
    name: "Hugging Face Open Source AI Agents Challenge",
    tagline: "Design multi-agent workflows and tool-calling models using open-weights LLMs.",
    description: "Leverage smolagents, LangGraph, and transformers to build agents that solve real-world automation, data extraction, and coding tasks. Hosted on Hugging Face Hub.",
    starts_at: "2026-09-10T00:00:00Z",
    ends_at: "2026-10-05T23:59:59Z",
    location: "Global",
    is_online: true,
    team_min: 1,
    team_max: 3,
    registration_url: "https://huggingface.co",
    image_url: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80",
    themes: ["AI/ML", "Open Source", "Security"],
    prizes: "$30,000 + GPU Compute Grants",
    status: "upcoming",
  },
  {
    id: "hack-cyberforce-defense",
    name: "CyberForce Cloud Security & Threat Hunting",
    tagline: "Red team / Blue team CTF and automated defense pipeline challenge.",
    description: "Competitors analyze zero-day vulnerability scenarios, configure IAM least-privilege guardrails, and build automated incident response lambdas to defend cloud infrastructure.",
    starts_at: "2026-09-15T12:00:00Z",
    ends_at: "2026-09-17T20:00:00Z",
    location: "Online",
    is_online: true,
    team_min: 1,
    team_max: 4,
    registration_url: "https://devpost.com/hackathons",
    image_url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80",
    themes: ["Security", "Cloud", "DevOps"],
    prizes: "$20,000 + Industry Mentorship",
    status: "upcoming",
  },
  {
    id: "hack-calhacks-2026",
    name: "Cal Hacks 12.0: University of California, Berkeley",
    tagline: "The world's largest collegiate hackathon hosted at UC Berkeley.",
    description: "Over 2,000 hackers assemble at the Metreon in San Francisco and virtually to create innovative applications in AI, hardware, spatial computing, and fintech.",
    starts_at: "2026-10-23T18:00:00Z",
    ends_at: "2026-10-25T15:00:00Z",
    location: "San Francisco, CA / Hybrid",
    is_online: true,
    team_min: 1,
    team_max: 4,
    registration_url: "https://calhacks.io",
    image_url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
    themes: ["AI/ML", "Web3", "Open Source", "FinTech"],
    prizes: "$100,000+ in Cash & Incubator Fast-Tracks",
    status: "upcoming",
  }
]

export default function HackathonsScreen() {
  const [tab, setTab] = useState('discover')
  const [hackathons, setHackathons] = useState(FALLBACK_HACKATHONS)
  const [myHackathons, setMyHackathons] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedTheme, setSelectedTheme] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [registeredIds, setRegisteredIds] = useState(new Map()) // id → status string
  const [activeDetail, setActiveDetail] = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadHackathons = useCallback(async () => {
    try {
      const [discoverRes, myRes] = await Promise.all([
        api.get('/api/hackathons').catch(() => ({ data: { hackathons: FALLBACK_HACKATHONS } })),
        api.get('/api/hackathons/user/mine').catch(() => ({ data: { hackathons: [] } }))
      ])
      const fetched = discoverRes?.data?.hackathons
      if (fetched && fetched.length > 0) {
        setHackathons(fetched)
      } else {
        setHackathons(FALLBACK_HACKATHONS)
      }
      const mine = myRes?.data?.hackathons || []
      setMyHackathons(mine)
      setRegisteredIds(new Map(mine.map(h => [h.id, h.user_status || 'registered'])))
    } catch {
      setHackathons(FALLBACK_HACKATHONS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadHackathons() }, [loadHackathons])

  const handleVisitSite = (hackathon) => {
    if (hackathon.registration_url) {
      window.open(hackathon.registration_url, '_blank', 'noopener')
    }
    // If not already tracked, show confirmation prompt
    if (!registeredIds.has(hackathon.id)) {
      setConfirmTarget(hackathon)
    }
  }

  const handleToggleRegister = async (hackathonId, action = 'registered') => {
    if (action === 'remove') {
      try {
        await api.delete(`/api/hackathons/${hackathonId}/register`)
        setRegisteredIds(prev => {
          const next = new Map(prev)
          next.delete(hackathonId)
          return next
        })
        setMyHackathons(prev => prev.filter(h => h.id !== hackathonId))
        showToast('Removed from My Hackathons')
      } catch {
        showToast('Could not remove', 'error')
      }
      return
    }

    try {
      await api.post(`/api/hackathons/${hackathonId}/register?status=${action}`)
      setRegisteredIds(prev => new Map([...prev, [hackathonId, action]]))
      const h = hackathons.find(x => x.id === hackathonId)
      if (h) {
        setMyHackathons(prev => {
          const filtered = prev.filter(item => item.id !== hackathonId)
          return [...filtered, { ...h, user_status: action }]
        })
      }
      const toastMsg = action === 'registered' ? 'Marked as Registered! ✓'
        : action === 'saved' ? 'Saved to My Hackathons! ✓'
        : 'Tracked! ✓'
      showToast(toastMsg)
      setConfirmTarget(null)
    } catch {
      showToast('Could not update tracking', 'error')
    }
  }

  const filtered = hackathons.filter(h => {
    const themeMatch = selectedTheme === 'All' || h.themes?.some(t => t.toLowerCase().includes(selectedTheme.toLowerCase()))
    const statusMatch = selectedStatus === 'All' || h.status === selectedStatus.toLowerCase()
    return themeMatch && statusMatch
  })

  return (
    <AppShell>
      <div className="font-['Inter',sans-serif] flex flex-col gap-8 pb-12">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-2 transition-all ${
            toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-[#0066cc] text-white dark:bg-[#C9D0D6] dark:text-[#09090B]'
          }`}>
            <span>{toast.msg}</span>
          </div>
        )}

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0066cc] via-[#0052a3] to-[#003d7a] p-8 sm:p-10 text-white shadow-[0_20px_60px_rgba(0,102,204,0.25)]">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white transform translate-x-32 -translate-y-32" />
            <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white transform -translate-x-16 translate-y-16" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h1 className="font-['Manrope'] font-extrabold text-3xl sm:text-4xl leading-tight mb-2">
                Join the World's Best<br />Hackathons
              </h1>
              <p className="text-white/75 text-sm sm:text-base max-w-md">
                Personalized to your learning path and skills.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-3 bg-white/15 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </div>
                <div>
                  <p className="font-bold">{hackathons.filter(h => h.is_online).length} Virtual / Online</p>
                  <p className="text-white/70 text-xs">open to global participants</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/15 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </div>
                <div>
                  <p className="font-bold">{hackathons.filter(h => h.status === 'upcoming').length} Upcoming Events</p>
                  <p className="text-white/70 text-xs">registration currently active</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#e0e0e0] dark:border-[#27272F]">
          {[
            { id: 'discover', label: 'Discover Hackathons' },
            { id: 'mine', label: 'My Hackathons' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                tab === t.id
                  ? 'border-[#0066cc] text-[#0066cc] dark:border-[#C9D0D6] dark:text-[#C9D0D6]'
                  : 'border-transparent text-[#7a7a7a] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'discover' && (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
              {/* Theme chips */}
              <div className="flex-1 overflow-x-auto pb-1">
                <div className="flex gap-2">
                  {THEME_CHIPS.map(theme => (
                    <button
                      key={theme}
                      onClick={() => setSelectedTheme(theme)}
                      className={`flex-none px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                        selectedTheme === theme
                          ? 'bg-[#0066cc] dark:bg-[#C9D0D6] text-white dark:text-[#09090B] border-[#0066cc] dark:border-[#C9D0D6]'
                          : 'bg-white dark:bg-[#121216] text-[#333] dark:text-[#D1D5DB] border-[#e0e0e0] dark:border-[#27272F] hover:border-[#0066cc] dark:hover:border-[#C9D0D6]'
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="w-44 flex-none">
                <CustomSelect
                  value={selectedStatus}
                  onChange={setSelectedStatus}
                  options={STATUS_TABS.map(s => ({ value: s, label: s === 'All' ? 'All Statuses' : s }))}
                />
              </div>
            </div>

            {/* Results info */}
            {!loading && !error && (
              <p className="text-sm text-[#7a7a7a] dark:text-[#9CA3AF]">
                Showing <strong className="text-[#1d1d1f] dark:text-white">{filtered.length}</strong> hackathons
                {selectedTheme !== 'All' && ` in ${selectedTheme}`}
                {selectedStatus !== 'All' && ` · ${selectedStatus}`}
              </p>
            )}

            {/* States */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 rounded-full border-4 border-[#e0e0e0] border-t-[#0066cc] animate-spin" />
                <p className="text-sm text-[#7a7a7a] dark:text-[#9CA3AF]">Loading hackathons…</p>
              </div>
            )}
            {error && !loading && (
              <div className="flex flex-col items-center gap-4 py-16">
                <p className="text-[#6e6e73] dark:text-[#9CA3AF] text-sm">{error}</p>
                <button onClick={loadHackathons} className="px-4 py-2 rounded-xl bg-[#0066cc] text-white text-sm font-semibold cursor-pointer">Retry</button>
              </div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 bg-white dark:bg-[#121216] rounded-2xl border border-[#e0e0e0] dark:border-[#27272F]">
                <p className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">No Hackathons Found</p>
                <p className="text-xs sm:text-sm text-[#7a7a7a] dark:text-[#9CA3AF] text-center max-w-sm">
                  No hackathon events match your current filter selection.
                </p>
                <button onClick={() => { setSelectedTheme('All'); setSelectedStatus('All') }} className="mt-2 text-xs font-bold text-[#0066cc] dark:text-[#C9D0D6] cursor-pointer">
                  Clear all filters
                </button>
              </div>
            )}

            {!loading && !error && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map(h => (
                  <HackathonCard
                    key={h.id}
                    hackathon={h}
                    registered={registeredIds.get(h.id) || null}
                    onVisitSite={handleVisitSite}
                    onToggleRegister={handleToggleRegister}
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
              <div className="flex flex-col items-center gap-3 py-16 bg-white dark:bg-[#121216] rounded-2xl border border-[#e0e0e0] dark:border-[#27272F]">
                <p className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">No Tracked Hackathons</p>
                <p className="text-xs sm:text-sm text-[#7a7a7a] dark:text-[#9CA3AF] text-center max-w-xs">
                  Click "Register on Website" or "Track" on any hackathon to track your participation here.
                </p>
                <button onClick={() => setTab('discover')} className="mt-2 px-4 py-2 rounded-xl bg-[#0066cc] text-white text-xs font-bold cursor-pointer">
                  Explore Hackathons
                </button>
              </div>
            ) : (
              myHackathons.map(h => {
                const s = STATUS_META[h.status] || STATUS_META.upcoming
                const userStatus = h.user_status || 'tracked'
                const statusLabel = userStatus === 'registered' ? '✓ Registered'
                  : userStatus === 'saved' ? '✓ Saved'
                  : '✓ Tracked'
                const statusColor = userStatus === 'registered'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : userStatus === 'saved'
                  ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                  : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                return (
                  <div key={h.id} className="bg-white dark:bg-[#121216] rounded-2xl border border-[#e0e0e0] dark:border-[#27272F] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-['Manrope'] font-extrabold text-base text-[#1d1d1f] dark:text-white">{h.name}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${s.bg} ${s.text}`}>{s.label}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <p className="text-xs text-[#7a7a7a] dark:text-[#9CA3AF]">
                        {fmt(h.starts_at)} → {fmt(h.ends_at)} · {h.is_online ? 'Virtual / Online' : h.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleToggleRegister(h.id, userStatus === 'registered' ? 'saved' : 'registered')}
                        className="px-3 py-1.5 rounded-xl border border-[#e0e0e0] dark:border-[#27272F] text-xs font-semibold text-[#1d1d1f] dark:text-white hover:bg-[#f5f5f7] dark:hover:bg-[#18181D] transition-colors cursor-pointer"
                      >
                        {userStatus === 'registered' ? 'Move to Saved' : 'Mark as Registered'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleRegister(h.id, 'remove')}
                        className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                      <a
                        href={h.registration_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-xl bg-[#0066cc] dark:bg-[#C9D0D6] text-white dark:text-[#09090B] text-xs font-bold hover:bg-[#004fa3] transition-colors"
                      >
                        View Event ↗
                      </a>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {activeDetail && (
        <HackathonDetailModal
          hackathon={activeDetail}
          registered={registeredIds.get(activeDetail.id) || null}
          onVisitSite={handleVisitSite}
          onToggleRegister={handleToggleRegister}
          onClose={() => setActiveDetail(null)}
        />
      )}

      {/* Post-Visit Confirmation Modal */}
      {confirmTarget && (
        <RegisterConfirmModal
          hackathon={confirmTarget}
          onConfirm={handleToggleRegister}
          onSaveInterest={handleToggleRegister}
          onClose={() => setConfirmTarget(null)}
        />
      )}
    </AppShell>
  )
}

import React, { useState } from 'react'
import { Bot, User, Send, Sparkles, Code2, ArrowRight } from 'lucide-react'

/**
 * InteractiveCoachTeaser
 * Demonstrates PathFinder's built-in 24/7 Context-Aware AI Coach
 */
export default function InteractiveCoachTeaser() {
  const prompts = [
    {
      q: 'Why does Multi-Head Attention scale as O(N²)?',
      a: 'Standard Self-Attention computes dot-product similarity between every token query (Q) and every token key (K), forming an N × N attention matrix. For a context of length N, this requires N² multiplications. In Week 3 of your roadmap, we dive into FlashAttention and RingAttention to eliminate memory bandwidth bottlenecks!',
      tag: 'Architecture Deep-Dive',
    },
    {
      q: 'How does PathFinder adapt if I fail a milestone?',
      a: 'PathFinder doesn’t just repeat the failed task. The AI detects whether the gap is conceptual (e.g. Linear Algebra foundations) or implementation (e.g. CUDA memory management). It injects targeted prerequisite micro-labs and adjusts future weekly timelines automatically!',
      tag: 'Adaptive Engine',
    },
    {
      q: 'Can I connect my GitHub profile to skip basic tasks?',
      a: 'Yes! PathFinder analyzes your public GitHub commits, stars, languages, and repo structures. If you’ve already built production FastAPI microservices or fine-tuned BERT models, those modules are validated and marked as mastered on day one.',
      tag: 'GitHub Sync',
    },
  ]

  const [selected, setSelected] = useState(0)

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl border border-[#E0E0E0] dark:border-[#263348] bg-white/90 dark:bg-[#111726]/90 backdrop-blur-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
      <div className="flex items-center justify-between pb-6 border-b border-[#F0F0F0] dark:border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0066CC] to-[#004FA3] flex items-center justify-center text-white shadow-md shadow-[#0066CC]/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-lg text-[#1D1D1F] dark:text-[#F8FAFC] flex items-center gap-2">
              PathFinder AI Coach
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </h3>
            <p className="text-xs text-[#7A7A7A] dark:text-[#94A3B8]">
              Instant, context-aware coaching for every milestone & code challenge
            </p>
          </div>
        </div>

        <div className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-[#EAF2FC] dark:bg-[#1E293B] text-[#0066CC] dark:text-[#38BDF8]">
          24/7 ACTIVE
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="my-5 flex flex-wrap gap-2">
        {prompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setSelected(idx)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
              selected === idx
                ? 'bg-[#0066CC] text-white shadow-md shadow-[#0066CC]/25'
                : 'bg-white dark:bg-[#1A2333] border border-[#E0E0E0] dark:border-[#263143] text-[#1D1D1F] dark:text-[#CBD5E1] hover:border-[#0066CC]'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>{p.q}</span>
          </button>
        ))}
      </div>

      {/* Simulated Chat Dialogue */}
      <div className="space-y-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#0C121D] p-5 border border-[#EAEFF6] dark:border-[#1E2837]">
        {/* User Question */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[#1D1D1F] dark:text-white flex-none text-xs font-bold">
            YOU
          </div>
          <div className="bg-white dark:bg-[#182130] p-3.5 rounded-2xl rounded-tl-none border border-[#E2E8F0] dark:border-[#243042] text-sm font-medium text-[#1D1D1F] dark:text-[#F1F5F9] shadow-xs">
            {prompts[selected].q}
          </div>
        </div>

        {/* AI Assistant Answer */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0066CC] to-[#004FA3] flex items-center justify-center text-white flex-none shadow-xs">
            <Bot className="w-4 h-4" />
          </div>
          <div className="bg-[#EAF2FC]/70 dark:bg-[#132238] p-4 rounded-2xl rounded-tl-none border border-[#CFE4FA] dark:border-[#1E3A5F] text-sm text-[#1D1D1F] dark:text-[#E2E8F0] leading-relaxed shadow-xs space-y-2">
            <div className="flex items-center justify-between border-b border-[#CFE4FA] dark:border-[#1E3A5F] pb-1.5 mb-1.5">
              <span className="text-[11px] font-extrabold text-[#0066CC] dark:text-[#38BDF8] uppercase tracking-wider font-mono">
                {prompts[selected].tag}
              </span>
              <span className="text-[10px] text-[#7A7A7A] dark:text-[#64748B]">Context: Active Roadmap</span>
            </div>
            <p>{prompts[selected].a}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

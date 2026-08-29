/**
 * Curated AI Interview question banks, track presets, filler word detector,
 * and intelligent heuristic evaluation algorithms.
 */

export const INTERVIEW_TRACKS = [
  {
    id: 'fullstack',
    name: 'Full Stack Engineer',
    description: 'System design, React/Node.js, state management, API resilience, and scalable databases.',
    badge: 'Popular',
    icon: 'code',
  },
  {
    id: 'frontend',
    name: 'Frontend Architect',
    description: 'Modern CSS/DOM, React performance, state architecture, accessibility, and bundle optimization.',
    badge: 'UI/UX',
    icon: 'layout',
  },
  {
    id: 'backend',
    name: 'Backend & System Design',
    description: 'Microservices, distributed caching, database indexing, concurrency, and fault tolerance.',
    badge: 'High Scale',
    icon: 'server',
  },
  {
    id: 'ai-ml',
    name: 'AI & ML Engineer',
    description: 'LLM orchestration, RAG architectures, model fine-tuning, embeddings, and vector databases.',
    badge: 'AI Focus',
    icon: 'sparkles',
  },
  {
    id: 'behavioral',
    name: 'Behavioral & Leadership',
    description: 'STAR methodology, handling ambiguity, team conflict resolution, and technical tradeoffs.',
    badge: 'Culture',
    icon: 'users',
  }
]

export const TRACK_QUESTIONS = {
  fullstack: [
    {
      id: 'fs-1',
      category: 'System Architecture',
      question: 'Can you walk me through the architecture of a full-stack web application you built, and explain why you chose that specific tech stack and state management pattern?',
      key_criteria: ['Layered architecture (client, API, DB)', 'State management rationale', 'Trade-offs and alternatives considered'],
      model_answer_summary: 'Clear division between presentation, business logic, and persistence. Explains state strategy (local vs global vs server cache) and justifies technology picks based on team velocity and latency requirements.',
      recommended_duration_sec: 90
    },
    {
      id: 'fs-2',
      category: 'API & Performance',
      question: 'Imagine a dashboard endpoint is suffering from 3-second latency under peak traffic. How would you systematically diagnose and optimize it end-to-end?',
      key_criteria: ['Browser network tab & waterfall profiling', 'API gateway / DB query explain plans & indexes', 'Multi-tier caching (Redis, HTTP cache headers)'],
      model_answer_summary: 'Begins with telemetry and APM profiling. Identifies N+1 queries, slow table scans, and payload over-fetching. Introduces indexes, pagination, and caching strategies.',
      recommended_duration_sec: 90
    },
    {
      id: 'fs-3',
      category: 'Concurrency & Resilience',
      question: 'How do you ensure data consistency and prevent race conditions when two users attempt to update the same shared resource simultaneously?',
      key_criteria: ['Optimistic locking vs Pessimistic locking', 'Atomic database operations', 'Idempotency keys'],
      model_answer_summary: 'Contrasts optimistic concurrency control (version numbers/eTags) with pessimistic row locks. Explains conflict resolution and retry backoff loops.',
      recommended_duration_sec: 75
    },
    {
      id: 'fs-4',
      category: 'Engineering Best Practices',
      question: 'Tell me about a production incident you encountered. How did you troubleshoot, mitigate the impact, and ensure it wouldn’t happen again?',
      key_criteria: ['STAR format (Situation, Task, Action, Result)', 'Observability & rollbacks', 'Blameless post-mortem & automated safeguards'],
      model_answer_summary: 'Walks through real-time triage, quick mitigation (feature flag toggle/rollback), root-cause analysis, and preventative regression tests or automated alerts.',
      recommended_duration_sec: 90
    }
  ],
  frontend: [
    {
      id: 'fe-1',
      category: 'Rendering & Lifecycle',
      question: 'Can you explain the difference between client-side rendering, server-side rendering, and static site generation, and when you would choose each?',
      key_criteria: ['SEO and Time-to-First-Byte (TTFB)', 'Hydration overhead & user interaction latency', 'Dynamic vs static content trade-offs'],
      model_answer_summary: 'Details SEO and initial render speed advantages of SSR/SSG vs dynamic client-heavy workflows. Explains hydration cost and incremental static regeneration (ISR).',
      recommended_duration_sec: 90
    },
    {
      id: 'fe-2',
      category: 'State & Component Architecture',
      question: 'How do you design a reusable component library or design system while balancing flexibility with maintainability and accessibility?',
      key_criteria: ['Compound components & slot patterns', 'ARIA standards & keyboard navigation', 'Design tokens & CSS architecture'],
      model_answer_summary: 'Focuses on headless primitives, flexible compound component APIs, accessibility (WCAG/WAI-ARIA), and scalable design token integration.',
      recommended_duration_sec: 90
    },
    {
      id: 'fe-3',
      category: 'Web Performance & Core Web Vitals',
      question: 'How do you optimize Core Web Vitals like Largest Contentful Paint (LCP) and Cumulative Layout Shift (CLS) in a modern web app?',
      key_criteria: ['Image optimization (WebP/AVIF, responsive srcsets)', 'Layout dimensions & font display swap', 'Code splitting & dynamic imports'],
      model_answer_summary: 'Discusses priority asset loading, reserving space for dynamic embeds to stop layout shifts, critical CSS inlining, and lazy-loading non-critical JS chunks.',
      recommended_duration_sec: 90
    }
  ],
  backend: [
    {
      id: 'be-1',
      category: 'Distributed Systems',
      question: 'How would you design a distributed rate limiter that can handle tens of thousands of requests per second across multiple data centers?',
      key_criteria: ['Token Bucket / Leaky Bucket / Sliding Window algorithm', 'Redis cluster with Lua scripts', 'Eventual consistency and local caching'],
      model_answer_summary: 'Explains sliding window log or token bucket algorithms. Uses centralized in-memory stores (Redis) with atomic Lua execution and local fallback buffering.',
      recommended_duration_sec: 90
    },
    {
      id: 'be-2',
      category: 'Database & Indexing',
      question: 'How do B-Tree indexes work in relational databases, and what happens behind the scenes during write and read operations on an indexed column?',
      key_criteria: ['Tree depth and logarithmic search O(log N)', 'Index leaf nodes & disk I/O reduction', 'Write amplification and rebalancing overhead'],
      model_answer_summary: 'Describes hierarchical tree traversal, range query efficiency, pointer lookups to heap data, and the write overhead of splitting and balancing nodes.',
      recommended_duration_sec: 90
    },
    {
      id: 'be-3',
      category: 'Message Queuing & Asynchrony',
      question: 'When using message brokers like Kafka or RabbitMQ, how do you guarantee at-least-once or exactly-once message delivery without duplicates?',
      key_criteria: ['Consumer acknowledgments & offsets', 'Idempotent consumer handlers & deduplication cache', 'Outbox pattern & transactional commits'],
      model_answer_summary: 'Discusses persistent offset tracking, transactional outbox patterns, unique message IDs with deduplication tables, and idempotent business logic.',
      recommended_duration_sec: 90
    }
  ],
  'ai-ml': [
    {
      id: 'ai-1',
      category: 'LLM Architecture & RAG',
      question: 'How does Retrieval-Augmented Generation (RAG) work, and how do you prevent hallucinations or poor retrieval precision in production?',
      key_criteria: ['Chunking strategies & vector embeddings', 'Hybrid search (dense + sparse/BM25)', 'Re-ranking & guardrail validation'],
      model_answer_summary: 'Explains document parsing, semantic chunking, vector indexing (HNSW), hybrid search combining keyword and dense vector retrieval, cross-encoder re-ranking, and grounded citation verification.',
      recommended_duration_sec: 90
    },
    {
      id: 'ai-2',
      category: 'Context Window & Memory',
      question: 'How do you manage conversational state and token budget limits when building multi-turn LLM agent workflows?',
      key_criteria: ['Sliding context windows & summarization', 'Semantic memory retrieval', 'System prompt token budget allocation'],
      model_answer_summary: 'Balances system instructions, dynamic tool schemas, short-term message buffer, and recursive summarization for long-running sessions.',
      recommended_duration_sec: 75
    }
  ],
  behavioral: [
    {
      id: 'beh-1',
      category: 'Conflict & Decision Making',
      question: 'Tell me about a time you strongly disagreed with a senior engineer or product manager on a technical roadmap decision. How did you handle it?',
      key_criteria: ['STAR structure', 'Objective data & proof-of-concept benchmarking', 'Commit and disagree principle'],
      model_answer_summary: 'Demonstrates professional empathy, structured communication, creating rapid prototypes with measurable data, and aligning behind team decisions.',
      recommended_duration_sec: 90
    },
    {
      id: 'beh-2',
      category: 'Mentorship & Culture',
      question: 'Describe a situation where you helped unblock a struggling teammate or mentored someone to level up their technical skills.',
      key_criteria: ['Pair programming & active listening', 'Empowering autonomous problem solving', 'Long-term impact on team velocity'],
      model_answer_summary: 'Focuses on constructive feedback, collaborative debugging without taking over the keyboard, and creating shared documentation.',
      recommended_duration_sec: 90
    }
  ]
}

const FILLER_WORDS = [
  'um', 'uh', 'er', 'ah', 'like', 'basically', 'actually', 'literally',
  'you know', 'sort of', 'kind of', 'i mean', 'right', 'honestly'
]

/**
 * Detects and counts filler words in a candidate's transcript
 */
export function analyzeFillerWords(text = '') {
  if (!text) return { count: 0, breakdown: {}, densityPercent: 0 }
  const lower = text.toLowerCase()
  const words = lower.match(/\b[a-z']+\b/g) || []
  const totalWords = words.length
  if (totalWords === 0) return { count: 0, breakdown: {}, densityPercent: 0 }

  const breakdown = {}
  let totalFillers = 0

  FILLER_WORDS.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi')
    const matches = lower.match(regex)
    if (matches && matches.length > 0) {
      breakdown[filler] = matches.length
      totalFillers += matches.length
    }
  })

  const densityPercent = Math.min(100, Math.round((totalFillers / totalWords) * 100))
  return {
    count: totalFillers,
    breakdown,
    totalWords,
    densityPercent,
    impact: totalFillers <= 3 ? 'Low (Excellent natural cadence)' : totalFillers <= 8 ? 'Moderate (Acceptable speaking flow)' : 'High (Try pausing instead of filler words)'
  }
}

/**
 * Calculates candidate speaking pacing (words per minute)
 */
export function calculatePacing(wordCount, durationSeconds) {
  if (!durationSeconds || durationSeconds <= 0) return { wpm: 0, status: 'N/A' }
  const minutes = durationSeconds / 60
  const wpm = Math.round(wordCount / minutes)
  let status = 'Optimal (120-160 WPM)'
  if (wpm < 100) status = 'Deliberate / Slow'
  else if (wpm > 175) status = 'Fast / Rapid delivery'
  return { wpm, status }
}

/**
 * Evaluates candidate responses client-side with rich feedback
 */
export function evaluateLocally({ topic, trackId, questions, answers, durationSec = 0 }) {
  let totalWords = 0
  let totalScore = 0
  const qEvals = []

  questions.forEach((q, idx) => {
    const ans = answers.find(a => a.question_id === q.id)
    const transcript = ans?.transcript?.trim() || ''
    const words = transcript ? transcript.split(/\s+/).length : 0
    totalWords += words

    // Check matching criteria
    const lowerTrans = transcript.toLowerCase()
    let matchedCriteria = 0
    q.key_criteria?.forEach(crit => {
      const critKeywords = crit.toLowerCase().split(/\s+/).filter(w => w.length > 3)
      const hasMatch = critKeywords.some(kw => lowerTrans.includes(kw))
      if (hasMatch) matchedCriteria++
    })

    // Compute question score (scale 0-100)
    let score = 70
    if (words > 80) score += 12
    else if (words > 40) score += 8
    else if (words > 15) score += 4
    else if (words === 0) score = 40

    if (matchedCriteria >= 2) score += 12
    else if (matchedCriteria === 1) score += 6

    score = Math.min(96, Math.max(50, score))
    totalScore += score

    const strengths = []
    const missing = []

    if (words >= 40) strengths.push('Detailed explanation with concrete context')
    if (matchedCriteria >= 1) strengths.push('Directly addressed core architectural criteria')
    if (strengths.length === 0) strengths.push('Clear, concise delivery style')

    if (matchedCriteria < (q.key_criteria?.length || 2)) {
      missing.push(q.key_criteria?.[q.key_criteria.length - 1] || 'Specific production metrics & constraints')
    }
    if (words < 30) {
      missing.push('Expand further with concrete technical examples and trade-offs')
    }

    qEvals.push({
      question_id: q.id,
      category: q.category,
      question: q.question,
      transcript: transcript || 'No verbal response recorded.',
      score,
      key_criteria: q.key_criteria,
      model_answer_summary: q.model_answer_summary,
      strengths,
      missing_concepts: missing.length > 0 ? missing : ['Minor edge case failure modes'],
      feedback: score >= 85
        ? 'Exceptional clarity and technical depth. Demonstrated strong real-world understanding.'
        : score >= 75
        ? 'Solid conceptual answer. Expanding on operational metrics and failure modes will make it even stronger.'
        : 'Good initial direction. Try structuring answers using the STAR format with deeper technical details.'
    })
  })

  const avgScore = Math.round(totalScore / (questions.length || 1))
  const combinedTrans = answers.map(a => a.transcript || '').join(' ')
  const fillerAnalysis = analyzeFillerWords(combinedTrans)
  const pacing = calculatePacing(totalWords, durationSec || (questions.length * 60))

  let verdict = 'Strong Hire'
  if (avgScore < 72) verdict = 'Needs Practice'
  else if (avgScore < 82) verdict = 'Leaning Hire'
  else if (avgScore < 90) verdict = 'Hire'

  return {
    overall_score: avgScore,
    verdict,
    summary: `Candidate demonstrated solid technical foundation for ${topic || 'the target role'}, communicating key concepts with ${avgScore >= 80 ? 'high confidence and strong structural clarity' : 'good fundamentals and active engagement'}.`,
    scores: {
      technical_depth: Math.min(98, Math.max(60, avgScore - 2)),
      communication_clarity: Math.min(98, Math.max(65, avgScore + 3)),
      problem_solving: Math.min(98, Math.max(60, avgScore)),
      confidence_structure: Math.min(98, Math.max(62, avgScore + 1))
    },
    metrics: {
      duration_sec: durationSec,
      total_words: totalWords,
      wpm: pacing.wpm,
      pacing_status: pacing.status,
      filler_words: fillerAnalysis
    },
    strengths: [
      'Articulate communication with structured reasoning',
      'Solid intuition for system design and engineering trade-offs',
      'Good engagement and professional response cadence'
    ],
    areas_for_improvement: [
      'Mention specific operational metrics (p99 latency, RPS, memory footprints)',
      'Discuss failure modes, retry policies, and fallback degradation strategies'
    ],
    question_evaluations: qEvals,
    recommended_learning_topics: [
      'High-Throughput Distributed Systems Architecture',
      'Database Query Profiling & Index Optimization',
      'Observability: OpenTelemetry, Metrics & Alerts'
    ]
  }
}

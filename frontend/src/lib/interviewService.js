import api from './apiClient'
import { evaluateLocally } from '../components/interview/interviewQuestions'

/**
 * AI Interview Service
 * Connects frontend with Amazon Bedrock question generation, adaptive multi-turn evaluation,
 * and Amazon Polly neural text-to-speech with graceful client-side fallback.
 */

export async function startInterviewSession(trackId = 'fullstack', customTopic = '', questionCount = 5) {
  try {
    const res = await api.post('/api/interview/start', {
      topic: customTopic || trackId,
      question_count: questionCount
    })
    if (res.data && res.data.question) {
      return res.data
    }
  } catch (err) {
    console.warn('Backend interview start endpoint unavailable, using local fallback:', err)
  }

  // Fallback if backend is unreachable
  return {
    session_id: 'local-' + Date.now(),
    current_question_index: 0,
    total_questions: questionCount || 5,
    target_role: customTopic || trackId || 'Software Engineering',
    current_milestone: 'Core Architecture',
    question: {
      id: 'q1',
      question: `To begin our interview for ${customTopic || trackId}, could you walk me through a core architectural challenge you tackled and how you decided on the design?`,
      category: 'Architecture & Fundamentals',
      difficulty: 'medium',
      skill_focus: 'System Architecture',
      key_criteria: ['Clear problem framing', 'Trade-off analysis', 'Component breakdown'],
      model_answer_summary: 'Candidate articulates technical constraints, evaluates alternatives, and justifies choices.'
    }
  }
}

export async function submitInterviewAnswer({
  sessionId,
  questionNumber,
  totalQuestions,
  currentQuestion,
  transcript,
  durationSec
}) {
  try {
    const res = await api.post('/api/interview/answer', {
      session_id: sessionId,
      question_number: questionNumber,
      total_questions: totalQuestions,
      current_question: currentQuestion,
      transcript: transcript || '',
      duration_sec: durationSec || 0
    })
    if (res.data && res.data.answer_evaluation) {
      return res.data
    }
  } catch (err) {
    console.warn('Backend answer evaluation failed, using adaptive local fallback:', err)
  }

  // Local fallback
  const isFinal = questionNumber >= totalQuestions
  const words = transcript ? transcript.trim().split(/\s+/).length : 0
  const score = Math.min(92, Math.max(60, 70 + Math.floor(words / 4)))

  return {
    question_number: questionNumber,
    answer_evaluation: {
      question_id: currentQuestion?.id || `q${questionNumber}`,
      score,
      verdict: score >= 80 ? 'strong' : score >= 65 ? 'partial' : 'weak',
      strengths: ['Directly addressed key concepts in the question'],
      missing_concepts: ['Include specific failure modes and metrics'],
      feedback: 'Good fundamental understanding. Advancing to the next question.'
    },
    completed: isFinal,
    next_question: isFinal ? null : {
      id: `q${questionNumber + 1}`,
      question: `Building on that, how would you handle unexpected production errors or high traffic bottlenecks in this design?`,
      category: 'Resilience & Deep Dive',
      difficulty: 'medium',
      skill_focus: currentQuestion?.skill_focus || 'System Reliability',
      key_criteria: ['Observability', 'Retry backoff / circuit breakers', 'Graceful degradation'],
      model_answer_summary: 'Discusses telemetry, alerts, and resilient fallback patterns.'
    }
  }
}

export async function finalizeInterviewSession({
  sessionId,
  trackId,
  topic,
  questions,
  answers,
  totalDurationSec
}) {
  try {
    const res = await api.post('/api/interview/finalize', {
      session_id: sessionId,
      questions,
      answers,
      total_duration_sec: totalDurationSec
    })
    if (res.data && typeof res.data.overall_score === 'number') {
      const localResult = evaluateLocally({ topic, trackId, questions, answers, durationSec: totalDurationSec })
      return {
        ...localResult,
        ...res.data,
        metrics: localResult.metrics,
        question_evaluations: questions.map((q, idx) => {
          const ans = answers.find(a => a.question_id === q.id || a.question_number === idx + 1)
          const ansEval = ans?.answer_evaluation || {}
          const rawTrans = (ans?.transcript || '').trim()
          const isNoAnswer = !rawTrans || rawTrans === 'Candidate answered verbally.' || rawTrans === 'No verbal response recorded.' || rawTrans.split(/\s+/).length < 3

          const score = isNoAnswer ? 0 : (ansEval.score ?? res.data.overall_score ?? 70)
          const strengths = isNoAnswer
            ? ['Initiated question prompt']
            : (ansEval.strengths?.length ? ansEval.strengths : ['Clear conceptual framing'])
          const missing_concepts = isNoAnswer
            ? ['Candidate did not provide a verbal answer to this question']
            : (ansEval.missing_concepts?.length ? ansEval.missing_concepts : ['Operational scaling metrics'])

          return {
            question_id: q.id,
            category: q.category,
            question: q.question,
            transcript: isNoAnswer ? 'No verbal response recorded.' : rawTrans,
            score,
            strengths,
            missing_concepts,
            model_answer_summary: q.model_answer_summary
          }
        })
      }
    }
  } catch (err) {
    console.warn('Backend final evaluation endpoint failed, computing local evaluation:', err)
  }

  // Pure local evaluation fallback
  return evaluateLocally({ topic, trackId, questions, answers, durationSec: totalDurationSec })
}

/**
 * Fetches Amazon Polly TTS audio for the given question.
 * Returns an Audio object or blob URL, or null if Polly is unavailable.
 */
export async function getPollyAudio(text, voiceId = 'Joanna') {
  try {
    const res = await api.post('/api/interview/tts', { text, voice_id: voiceId }, {
      responseType: 'blob'
    })
    if (res.data && res.data.size > 0) {
      return URL.createObjectURL(res.data)
    }
  } catch (err) {
    // Expected when Polly is offline or not configured in local dev
  }
  return null
}

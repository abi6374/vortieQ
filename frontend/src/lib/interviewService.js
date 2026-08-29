import api from './apiClient'
import { TRACK_QUESTIONS, evaluateLocally } from '../components/interview/interviewQuestions'

/**
 * AI Interview Service
 * Fetches personalized questions and handles session evaluation via API or local fallback.
 */

export async function fetchInterviewQuestions(trackId = 'fullstack', customTopic = '', count = 4) {
  try {
    const res = await api.post('/api/interview/questions', {
      topic: customTopic || trackId,
      count
    })
    if (res.data?.questions && Array.isArray(res.data.questions) && res.data.questions.length > 0) {
      return res.data.questions
    }
  } catch (err) {
    console.warn('Backend interview questions endpoint unavailable, using local track questions:', err)
  }

  // Fallback to curated track questions
  const list = TRACK_QUESTIONS[trackId] || TRACK_QUESTIONS.fullstack
  return list.slice(0, count)
}

export async function evaluateInterviewSession({ trackId, topic, questions, answers, durationSec }) {
  try {
    const res = await api.post('/api/interview/evaluate', {
      topic: topic || trackId,
      questions,
      answers,
      duration_sec: durationSec
    })
    if (res.data && res.data.overall_score) {
      // Merge with local filler analysis and question metrics if missing
      const localResult = evaluateLocally({ topic, trackId, questions, answers, durationSec })
      return {
        ...localResult,
        ...res.data,
        metrics: localResult.metrics,
        question_evaluations: res.data.question_evaluations?.map((qe, i) => ({
          ...localResult.question_evaluations[i],
          ...qe
        })) || localResult.question_evaluations
      }
    }
  } catch (err) {
    console.warn('Backend interview evaluation endpoint failed, falling back to local evaluation:', err)
  }

  // Compute rich local evaluation
  return evaluateLocally({ topic, trackId, questions, answers, durationSec })
}

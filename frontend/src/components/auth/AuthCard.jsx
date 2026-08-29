import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent align-[-2px]" />
  )
}

export default function AuthCard() {
  const [activeTab, setActiveTab] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  // Clear the error as soon as the user starts correcting their input
  const handleChange = (setter) => (e) => {
    setter(e.target.value)
    if (error) setError(null)
  }

  const switchTab = (tab) => {
    setActiveTab(tab)
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      if (activeTab === 'signin') {
        await signIn(email, password)
        navigate('/dashboard')
      } else {
        await signUp(email, password, fullName)
        navigate('/onboarding')
      }
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const isSignUp = activeTab === 'signup'

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => switchTab('signin')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${!isSignUp
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => switchTab('signup')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${isSignUp
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={handleChange(setFullName)}
              className={INPUT_CLASS}
              placeholder="HCL Tech"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={handleChange(setEmail)}
            className={INPUT_CLASS}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={handleChange(setPassword)}
            className={INPUT_CLASS}
            placeholder="••••••••"
          />
          {isSignUp && (
            <p className="mt-1 text-xs text-gray-500">At least 6 characters</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading && <Spinner />}
          {isSignUp ? 'Create Account' : 'Sign In'}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  )
}

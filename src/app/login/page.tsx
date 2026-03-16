'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        const next = searchParams.get('next') || '/'
        router.push(next)
        router.refresh()
      } else {
        setError('Invalid password')
      }
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bebas text-white tracking-wider">MAKE IT HAPPEN</h1>
          <p className="text-zinc-500 text-sm mt-1">Dashboard Access</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-[#620E06] focus:ring-1 focus:ring-[#620E06] transition-colors"
              autoFocus
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 bg-[#620E06] hover:bg-[#7a1208] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors uppercase tracking-wider text-sm"
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>

        <p className="text-zinc-700 text-xs text-center mt-6">
          🔒 Protected dashboard
        </p>
      </div>
    </div>
  )
}

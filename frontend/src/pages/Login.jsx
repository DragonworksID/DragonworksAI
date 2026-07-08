import { useState } from 'react'

export default function Login({ onLoggedIn }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !password) { setError('Please enter your username and password.'); return }
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Login failed')
      onLoggedIn({ username: data.username, role: data.role })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">
          <div className="logo-icon">✦</div>
          <div className="logo-name">Dragonworks <span>Studio</span></div>
          <div className="logo-tagline">Dragonworks AI Dept.</div>
        </div>

        <div className="login-title">Sign in</div>

        {error && (
          <div className="error-banner" style={{ marginBottom: 14 }}>
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        <div className="form-group full" style={{ marginBottom: 14 }}>
          <label className="form-label">Username</label>
          <input
            className="form-input"
            autoFocus
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>

        <div className="form-group full" style={{ marginBottom: 20 }}>
          <label className="form-label">Password</label>
          <input
            className="form-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        <button className="btn-generate" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? <><div className="spinner" /> Signing in…</> : 'Sign in'}
        </button>

        <div className="login-footnote">
          Ask your admin if you don't have an account yet.
        </div>
      </form>
    </div>
  )
}

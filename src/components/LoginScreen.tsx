import { useState } from 'react'
import { User, UserRole } from '../types'
import { loadUsers, saveCurrentUser } from '../utils/storage'
import './LoginScreen.css'

interface LoginScreenProps {
    onLogin: (user: User) => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        // Simulate network delay for better UX
        setTimeout(async () => {
            try {
                const users = await loadUsers()
                const user = users.find(u => u.username === username && u.password === password)

                if (user) {
                    saveCurrentUser(user)
                    onLogin(user)
                } else {
                    setError('Invalid username or password')
                    setLoading(false)
                }
            } catch (err) {
                setError('Connection error')
                setLoading(false)
            }
        }, 600)
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <img src="/logo.png" alt="The Circle" className="login-logo" />
                    <h1 className="login-title">the circle</h1>
                    <p className="login-subtitle">Workspace Management System</p>
                </div>

                <form onSubmit={handleLogin} className="login-form">
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input
                            type="text"
                            className="form-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            autoFocus
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    {error && <div className="login-error">{error}</div>}

                    <button
                        type="submit"
                        className="button button-primary"
                        style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Demo Credentials:</p>
                    <div className="demo-credentials">
                        <small>Admin: admin / password</small>
                        <small>Front Desk: frontdesk / password</small>
                    </div>
                </div>
            </div>
        </div>
    )
}

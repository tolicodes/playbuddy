// src/components/EmailLoginButton.tsx
import React, { useState, useEffect } from 'react'
import { supabaseClient } from '../lib/supabaseClient'
import axios from 'axios'

// Suppose `sessionToken` is the current Supabase access token (JWT)
function setAxiosAuthHeader(sessionToken: string) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${sessionToken}`
}

export default function EmailLoginForm() {
    // ─── Local state: email, password, sessionToken, loading, error ───────────
    const [email, setEmail] = useState<string>('')
    const [password, setPassword] = useState<string>('')
    const [sessionToken, setSessionToken] = useState<string>(
        localStorage.getItem('supabase.auth.token') || ''
    )
    const [loading, setLoading] = useState<boolean>(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    // ─── On mount, check for existing session ──────────────────────────────────
    useEffect(() => {
        if (sessionToken) {
            setAxiosAuthHeader(sessionToken)
        }
    }, [sessionToken])

    // ─── Handle form submit: sign in with email & password ─────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMsg(null)

        if (!email.trim() || !password) {
            setErrorMsg('Please enter both email and password.')
            return
        }

        setLoading(true)
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email.trim(),
            password,
        })

        setLoading(false)

        if (error) {
            setErrorMsg(error.message)
        } else if (data.session?.access_token) {
            setSessionToken(data.session.access_token)
            localStorage.setItem('supabase.auth.token', data.session.access_token)
            setEmail('')
            setPassword('')
        }
    }

    // ─── Handle “Sign Out” ──────────────────────────────────────────────────────
    const handleSignOut = async () => {
        await supabaseClient.auth.signOut()
        localStorage.removeItem('supabase.auth.token')
        setSessionToken('')
    }

    return (
        <div style={{ maxWidth: 400, margin: '2rem auto', padding: '1rem', border: '1px solid #ddd', borderRadius: 8 }}>
            {!sessionToken ? (
                <>
                    <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Email Login</h2>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                        <label style={{ display: 'flex', flexDirection: 'column' }}>
                            Email
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{ padding: '0.5rem', fontSize: '1rem' }}
                                required
                            />
                        </label>

                        <label style={{ display: 'flex', flexDirection: 'column' }}>
                            Password
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ padding: '0.5rem', fontSize: '1rem' }}
                                required
                            />
                        </label>

                        {errorMsg && (
                            <div style={{ color: 'red', fontSize: '0.9rem' }}>{errorMsg}</div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '0.75rem',
                                fontSize: '1rem',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: 4,
                                cursor: loading ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {loading ? 'Signing in…' : 'Sign In'}
                        </button>
                    </form>
                </>
            ) : (
                <>
                    <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>You’re Logged In</h2>
                    <div style={{ fontSize: '0.9rem', wordBreak: 'break-all', marginBottom: '1rem' }}>
                        <strong>Access Token:</strong> {sessionToken}
                    </div>
                    <button
                        onClick={handleSignOut}
                        style={{
                            padding: '0.75rem',
                            fontSize: '1rem',
                            backgroundColor: '#e53e3e',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            width: '100%',
                        }}
                    >
                        Sign Out
                    </button>
                </>
            )}
        </div>
    )
}

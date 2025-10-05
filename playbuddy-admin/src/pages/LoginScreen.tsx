// src/components/EmailLogin.tsx
import React, { useEffect, useState } from 'react'
import { supabaseClient } from '../lib/supabaseClient'

export default function EmailLogin() {
    const [status, setStatus] = useState<'checking' | 'loggedOut' | 'loggedIn'>('checking')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    // 1) Check auth token to be valid
    useEffect(() => {
        (async () => {
            const { data, error } = await supabaseClient.auth.getUser()
            if (error || !data.user) setStatus('loggedOut')
            else setStatus('loggedIn')
        })()
    }, [])

    // 2) If not valid then show login (minimal email/password)
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMsg(null)
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email.trim(),
            password,
        })
        if (error || !data.user) setErrorMsg(error?.message || 'Login failed')
        else setStatus('loggedIn')
    }

    if (status === 'checking') return null

    // 3) If valid then show "logged in"
    if (status === 'loggedIn') return <div>logged in</div>

    // loggedOut -> show simple login
    return (
        <form onSubmit={handleLogin} style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
            <input
                type="email"
                placeholder="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />
            <input
                type="password"
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />
            {errorMsg && <div style={{ color: 'red', fontSize: 12 }}>{errorMsg}</div>}
            <button type="submit">Login</button>
        </form>
    )
}

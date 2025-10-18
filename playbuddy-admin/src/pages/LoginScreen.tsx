// src/components/EmailLogin.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { supabaseClient } from '../lib/supabaseClient';

// ---- Axios auth (global) ----------------------------------------------------
let axiosAuthInitialized = false;

async function setDefaultAuthHeaderFromSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const token = session?.access_token ?? null;
    if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    else delete axios.defaults.headers.common['Authorization'];
}

function initAxiosAuthOnce() {
    if (axiosAuthInitialized) return;
    axiosAuthInitialized = true;

    // Attach fresh token before every request (pre-refresh if near expiry)
    axios.interceptors.request.use(async (config) => {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const now = Math.floor(Date.now() / 1000);
        let s = session;

        // If missing or about to expire in <=5s, refresh first
        if (!s || (s.expires_at ?? 0) <= now + 5) {
            const { data, error } = await supabaseClient.auth.refreshSession();
            if (!error) s = data.session;
        }

        const token = s?.access_token ?? null;
        if (token) {
            // set both the per-request header and the global default for any plain axios calls
            (config.headers as any).Authorization = `Bearer ${token}`;
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete (config.headers as any).Authorization;
            delete axios.defaults.headers.common['Authorization'];
        }
        return config;
    });

    // Retry once on 401 after a refresh
    axios.interceptors.response.use(
        (res) => res,
        async (error) => {
            const original = error?.config || {};
            if (error?.response?.status === 401 && !original._retry) {
                original._retry = true; // not typed on AxiosRequestConfig, but fine
                try {
                    const { data, error: refreshErr } = await supabaseClient.auth.refreshSession();
                    if (refreshErr) throw refreshErr;

                    const token = data.session?.access_token ?? null;
                    if (token) {
                        original.headers = { ...(original.headers || {}), Authorization: `Bearer ${token}` };
                        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    } else {
                        if (original.headers) delete original.headers.Authorization;
                        delete axios.defaults.headers.common['Authorization'];
                    }
                    return axios(original);
                } catch (e) {
                    await supabaseClient.auth.signOut({ scope: 'local' });
                    return Promise.reject(e);
                }
            }
            return Promise.reject(error);
        }
    );
}
// ----------------------------------------------------------------------------

export default function EmailLogin() {
    const [status, setStatus] = useState<'checking' | 'loggedOut' | 'loggedIn'>('checking');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        initAxiosAuthOnce();

        let unsub: (() => void) | undefined;
        (async () => {
            await setDefaultAuthHeaderFromSession();
            const { data: { session } } = await supabaseClient.auth.getSession();
            setStatus(session?.access_token ? 'loggedIn' : 'loggedOut');

            const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (_event, s) => {
                // keep defaults in sync immediately on login/logout/refresh
                const token = s?.access_token ?? null;
                if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                else delete axios.defaults.headers.common['Authorization'];
                setStatus(token ? 'loggedIn' : 'loggedOut');
            });
            unsub = () => subscription.unsubscribe();
        })();

        return () => { unsub?.(); };
    }, []);

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMsg(null);
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email.trim(),
            password,
        });
        if (error || !data.user) setErrorMsg(error?.message ?? 'Login failed');
        // axios defaults/interceptors handle headers and refreshes
    };

    const handleSignOut = async () => {
        setErrorMsg(null);
        const { error } = await supabaseClient.auth.signOut();
        if (error) setErrorMsg(error.message);
    };

    if (status === 'checking') {
        return (
            <div style={{ padding: 16, color: '#6B7280', fontSize: 14 }}>
                Checking session…
            </div>
        );
    }

    if (status === 'loggedIn') {
        return (
            <div style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
                <div>Logged in</div>
                <button type="button" onClick={handleSignOut}>Sign Out</button>
                {errorMsg && <div style={{ color: 'red', fontSize: 12 }}>{errorMsg}</div>}
            </div>
        );
    }

    return (
        <form onSubmit={handleLogin} style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
            <label htmlFor="login-username">Email</label>
            <input
                id="login-username"
                name="username"             // helps heuristics
                type="email"
                inputMode="email"
                autoComplete="username webauthn" // enables passkey + password autofill
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />

            <label htmlFor="login-password">Password</label>
            <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />

            {errorMsg && <div style={{ color: 'red', fontSize: 12 }}>{errorMsg}</div>}
            <button type="submit">Log in</button>
        </form>

    );
}

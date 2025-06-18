// src/components/BusinessCardUploader.tsx
import React, { useState, useEffect } from 'react'
import CardSelector, { RectCoords } from './CardSelector'
import { supabaseClient } from '../../lib/supabaseClient'

interface BusinessCardUploaderProps {
    /** Called when frontUrl, backUrl and qr region are all available */
    onComplete: (frontUrl: string, backUrl: string, qr: RectCoords) => void
}

export default function BusinessCardUploader({ onComplete }: BusinessCardUploaderProps) {
    const [frontUrl, setFrontUrl] = useState<string | null>(null)
    const [backUrl, setBackUrl] = useState<string | null>(null)
    const [qr, setQr] = useState<RectCoords | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    // Normalize a File to landscape: rotate on canvas if needed
    async function normalizeFile(file: File): Promise<Blob> {
        const imgBitmap = await createImageBitmap(file)
        if (imgBitmap.width >= imgBitmap.height) {
            // already landscape
            return file
        }
        // rotate 90° on canvas
        const canvas = document.createElement('canvas')
        canvas.width = imgBitmap.height
        canvas.height = imgBitmap.width
        const ctx = canvas.getContext('2d')!
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate(Math.PI / 2)
        ctx.drawImage(imgBitmap, -imgBitmap.width / 2, -imgBitmap.height / 2)
        return await new Promise<Blob>(resolve => {
            canvas.toBlob(b => resolve(b!), 'image/png')
        })
    }

    // Upload normalized file to Supabase
    async function upload(file: File, label: 'front' | 'back') {
        setError(null)
        setBusy(true)
        try {
            const normalized = await normalizeFile(file)
            const ext = file.name.split('.').pop() || 'png'
            const key = `card-assets/${Date.now()}-${label}.${ext}`

            const { error: upErr } = await supabaseClient
                .storage
                .from('general')
                .upload(key, normalized)
            if (upErr) throw upErr

            const { data: { publicUrl } } = supabaseClient
                .storage
                .from('general')
                .getPublicUrl(key)

            if (label === 'front') setFrontUrl(publicUrl)
            else setBackUrl(publicUrl)
        } catch (e: any) {
            console.error('Upload error', e)
            setError(`Failed to upload ${label}: ${e.message}`)
        } finally {
            setBusy(false)
        }
    }

    // Once we have both URLs + QR, fire onComplete
    useEffect(() => {
        if (frontUrl && backUrl && qr) {
            onComplete(frontUrl, backUrl, qr)
        }
    }, [frontUrl, backUrl, qr])

    return (
        <div style={{ fontFamily: 'sans-serif', marginBottom: 24 }}>
            <h2>3️⃣ Upload Business Card Assets + Select QR</h2>

            <div style={{ marginBottom: 16 }}>
                <label>
                    Front Image:{' '}
                    <input
                        type="file"
                        accept="image/*"
                        disabled={busy}
                        onChange={e => {
                            const f = e.target.files?.[0]
                            if (f) upload(f, 'front')
                        }}
                    />
                </label>
                {frontUrl && (
                    <div style={{ marginTop: 8 }}>
                        <img
                            src={frontUrl}
                            alt="Front"
                            style={{ maxWidth: 200, border: '1px solid #ccc' }}
                        />
                    </div>
                )}
            </div>

            <div style={{ marginBottom: 16 }}>
                <label>
                    Back Image:{' '}
                    <input
                        type="file"
                        accept="image/*"
                        disabled={busy}
                        onChange={e => {
                            const f = e.target.files?.[0]
                            if (f) upload(f, 'back')
                        }}
                    />
                </label>
                {backUrl && (
                    <div style={{ marginTop: 8 }}>
                        <img
                            src={backUrl}
                            alt="Back"
                            style={{ maxWidth: 200, border: '1px solid #ccc' }}
                        />
                    </div>
                )}
            </div>

            {backUrl && (
                <div style={{ marginTop: 16 }}>
                    <h3>Select QR Region on Back</h3>
                    <CardSelector
                        imageUrl={backUrl}
                        onSelect={setQr}
                        instruction="Drag to select the QR code area"
                    />
                </div>
            )}

            {qr && (
                <div style={{
                    marginTop: 16,
                    padding: 12,
                    background: '#f9f9f9',
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    fontFamily: 'monospace'
                }}>
                    <strong>QR Coordinates:</strong>
                    <pre style={{ margin: 0 }}>
                        x: {qr.x}, y: {qr.y}, width: {qr.width}, height: {qr.height}
                    </pre>
                </div>
            )}

            {error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}
        </div>
    )
}

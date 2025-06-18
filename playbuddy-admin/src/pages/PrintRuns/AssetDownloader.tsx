// src/components/AssetDownloader.tsx
import React from 'react'
import JSZip from 'jszip'

export interface Mapping {
    printRunAssetNumber: number
    code: string
}

interface SizeConfig {
    flyer_name: string
    type: string
    qr_width: number
    qr_height: number
    qr_x: number
    qr_y: number
}

interface AssetDownloaderProps {
    mappings: Mapping[]
    frontUrl: string
    backUrl: string
    sizesConfig: SizeConfig[]
    onAssetsGenerated?: (blobs: {
        inputCsv: Blob
        front: Blob
        back: Blob
        sizesJson: Blob
        zipFile: Blob
    }) => void
}

export default function AssetDownloader({
    mappings,
    frontUrl,
    backUrl,
    sizesConfig,
    onAssetsGenerated
}: AssetDownloaderProps) {
    // helper to fetch a URL to Blob
    const fetchBlob = async (url: string) => {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`)
        return res.blob()
    }

    // build CSV text
    const csvText = [
        'ID,URL',
        ...mappings.map(m => `${m.printRunAssetNumber},${m.code}`)
    ].join('\r\n')
    const csvBlob = new Blob([csvText], { type: 'text/csv;charset=utf-8' })

    // build sizes.json blob
    const sizesJsonText = JSON.stringify(sizesConfig, null, 2)
    const sizesBlob = new Blob([sizesJsonText], { type: 'application/json' })

    const handleDownloadAll = async () => {
        if (!mappings.length) {
            alert('No mappings provided')
            return
        } else if (!frontUrl) {
            alert('No front image provided')
            return
        } else if (!backUrl) {
            alert('No back image provided')
            return
        } else if (!sizesConfig.length) {
            alert('No sizes config provided')
            return
        }
        try {
            const zip = new JSZip()

            // 1) Add input.csv
            zip.file('input.csv', csvText)

            // 2) Fetch & add front.png
            const frontBlob = await fetchBlob(frontUrl)
            zip.file('front.png', frontBlob)

            // 3) Fetch & add back.png
            const backBlob = await fetchBlob(backUrl)
            zip.file('back.png', backBlob)

            // 4) Add sizes.json
            zip.file('sizes.json', sizesJsonText)

            // 5) Generate the ZIP
            const zipBlob = await zip.generateAsync({ type: 'blob' })

            // 6) Download it
            const url = URL.createObjectURL(zipBlob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'assets.zip'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            // 7) Emit if parent cares
            onAssetsGenerated?.({
                inputCsv: csvBlob,
                front: frontBlob,
                back: backBlob,
                sizesJson: sizesBlob,
                zipFile: zipBlob
            })
        } catch (err: any) {
            console.error('Failed to build ZIP:', err)
            alert(`Error: ${err.message}`)
        }
    }

    return (
        <div style={{ fontFamily: 'sans-serif', maxWidth: 400, margin: '2rem auto' }}>
            <button
                onClick={handleDownloadAll}
                style={{
                    width: '100%',
                    padding: 12,
                    background: '#007bff',
                    color: '#fff',
                    border: 'none',
                    fontSize: '1rem',
                    cursor: 'pointer'
                }}
            >
                📥 Download All Assets as ZIP
            </button>

            <p style={{ marginTop: 12, fontSize: '.9rem', color: '#555' }}>
                This will package and download a single <code>assets.zip</code> containing:
                <ol>
                    <li><code>input.csv</code> (ID,URL)</li>
                    <li><code>front.png</code> (fetched from frontUrl)</li>
                    <li><code>back.png</code> (fetched from backUrl)</li>
                    <li><code>sizes.json</code></li>
                </ol>
            </p>
        </div>
    )
}

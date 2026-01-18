// src/components/BranchExtractor.tsx
import React, { useState } from 'react'
import Papa from 'papaparse'

export interface Mapping {
    printRunAssetNumber: number
    code: string
}

interface BranchExtractorProps {
    assignee: string
    version: string
    startNumber: number
    count: number
    onExtract: (mappings: Mapping[]) => void
}

const escapeRegExp = (str: string) =>
    str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')

export default function BranchExtractor({
    assignee,
    version,
    startNumber,
    count,
    onExtract
}: BranchExtractorProps) {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [mappings, setMappings] = useState<Mapping[]>([])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setLoading(true)
        setError(null)
        setMappings([])

        Papa.parse<string[]>(file, {
            skipEmptyLines: true,
            complete: (res) => {
                const rows = res.data

                // Step 1: Find the header row with "Title & Url"
                const hdrIdx = rows.findIndex(r =>
                    r.some(c => c.toLowerCase().includes('title & url'))
                )

                if (hdrIdx < 0) {
                    setError('Could not find header row containing “Title & Url”.')
                    setLoading(false)
                    return
                }

                const header = rows[hdrIdx].map(c => c.toLowerCase())
                const titleUrlIdx = header.findIndex(c => c.includes('title & url'))

                if (titleUrlIdx < 0) {
                    setError('Header row is missing the required "Title & Url" column.')
                    setLoading(false)
                    return
                }

                // Match entries like: [300] Peanutbutter ... / https://...
                const re = new RegExp(`\\[(\\d+)\\]\\s*${escapeRegExp(assignee)}`, 'i')
                const urlRe = /(https?:\/\/\S+)/

                const out: Mapping[] = []

                for (let i = hdrIdx + 1; i < rows.length; i++) {
                    const row = rows[i]
                    const cell = (row[titleUrlIdx] || '').trim()

                    const m = cell.match(re)
                    const urlMatch = cell.match(urlRe)
                    if (!m || !urlMatch) continue

                    const n = parseInt(m[1], 10)
                    if (n >= startNumber && n < startNumber + count) {
                        const code = urlMatch[1].split('/').pop() || ''
                        if (code) {
                            out.push({ printRunAssetNumber: n, code })
                        }
                    }
                }

                if (out.length === 0) {
                    setError(`No rows found for numbers starting at ${startNumber}.`)
                }

                setMappings(out)
                onExtract(out)
                setLoading(false)

            },
            error: (err) => {
                setError(err.message)
                setLoading(false)
            }
        })
    }

    return (
        <div style={{ marginBottom: 24, fontFamily: 'sans-serif' }}>
            <h2>2️⃣ Extract Codes from Branch Export</h2>

            <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={loading}
            />

            {error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}

            {mappings.length > 0 && (
                <div style={{ marginTop: 12 }}>
                    <p>✅ Extracted {mappings.length} code(s):</p>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ border: '1px solid #ccc', padding: 8 }}>#</th>
                                <th style={{ border: '1px solid #ccc', padding: 8 }}>Code</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mappings.map(({ printRunAssetNumber, code }) => (
                                <tr key={printRunAssetNumber}>
                                    <td style={{ border: '1px solid #ccc', padding: 8 }}>
                                        {printRunAssetNumber}
                                    </td>
                                    <td style={{ border: '1px solid #ccc', padding: 8 }}>
                                        {code}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

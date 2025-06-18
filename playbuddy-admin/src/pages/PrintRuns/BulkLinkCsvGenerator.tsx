// src/components/BulkLinkCsvGenerator.tsx
import React, { useState, useEffect } from 'react'
import Papa from 'papaparse'

interface BulkLinkCsvGeneratorProps {
    campaignName: string,
    assignee: string,
    startNumber: number,
    setStartNumber: (startNumber: number) => void
    count: number,
    setCount: (count: number) => void
}

export default function BulkLinkCsvGenerator({
    campaignName,
    assignee,
    startNumber,
    setStartNumber,
    count,
    setCount
}: BulkLinkCsvGeneratorProps) {
    const [disabled, setDisabled] = useState<boolean>(true)

    // only enable download when all fields are valid
    useEffect(() => {
        console.log(campaignName, count)
        setDisabled(
            !campaignName.trim() ||
            count < 1
        )
    }, [campaignName, count])

    const handleDownload = () => {
        // Build rows for n = startNumber ... startNumber+count-1
        const rows = []
        for (let i = 0; i < count; i++) {
            const campaign = `[${startNumber + i}] ${campaignName}`
            const data = {
                $marketing_title: campaign,
                $og_description: `Connect with ${assignee} on Playbuddy`
            }
            rows.push({
                campaign,
                channel: '',
                feature: '',
                stage: '',
                tags: '',
                alias: '',
                data: JSON.stringify(data)
            })
        }

        // Stringify to CSV
        const csv = Papa.unparse(rows, { header: true })

        // Trigger browser download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'branch_bulk_links.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div style={{ marginBottom: 24, fontFamily: 'sans-serif' }}>
            <h2>2 Generate Branch CSV</h2>



            <label style={{ display: 'block', marginBottom: 12 }}>
                Start Number<br />
                <input
                    type="number"
                    value={startNumber}
                    onChange={e => setStartNumber(Math.max(0, +e.target.value))}
                    style={{ width: '100%', padding: 8, fontSize: '1rem' }}
                />
            </label>

            <label style={{ display: 'block', marginBottom: 12 }}>
                Count (number of links)<br />
                <input
                    type="number"
                    value={count}
                    onChange={e => setCount(Math.max(0, +e.target.value))}
                    style={{ width: '100%', padding: 8, fontSize: '1rem' }}
                />
            </label>

            <button
                onClick={handleDownload}
                disabled={disabled}
                style={{
                    padding: '12px',
                    background: disabled ? '#ccc' : '#007bff',
                    color: disabled ? '#666' : '#fff',
                    border: 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: '1rem'
                }}
            >
                Download Branch CSV
            </button>
        </div>
    )
}

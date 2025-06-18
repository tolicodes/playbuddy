// src/components/CampaignTitleForm.tsx
import React, { useEffect } from 'react'
import { useFetchFacilitators } from '../../common/db-axios/useFacilitators'

interface Facilitator {
    id: string
    name: string
}

interface CampaignTitleFormProps {
    facilitatorId: string
    assigneeName: string
    type: string
    version: string
    setFacilitatorId: (id: string) => void
    setAssigneeName: (name: string) => void
    setType: (type: string) => void
    setVersion: (version: string) => void
    setCampaignName: (campaignName: string) => void
}

export default function CampaignTitleForm({
    facilitatorId,
    assigneeName,
    type,
    version,
    setFacilitatorId,
    setAssigneeName,
    setType,
    setVersion,
    setCampaignName
}: CampaignTitleFormProps) {
    // 1) fetch facilitators
    const { data: facilitators = [], isLoading } = useFetchFacilitators() as {
        data: Facilitator[]
        isLoading: boolean
    }

    // 2) when facilitatorId changes, default assigneeName to facilitator.name
    useEffect(() => {
        if (!facilitatorId) return
        const f = facilitators.find(f => f.id === facilitatorId)
        if (f) setAssigneeName(f.name)
    }, [facilitatorId, facilitators, setAssigneeName])

    // 3) whenever any of the fields changes, compose & emit the campaignName
    useEffect(() => {
        console.log(assigneeName, type, version)
        if (assigneeName && type && version) {
            const campaignName = `${assigneeName} ${type} (${version})`
            console.log(campaignName)
            setCampaignName(campaignName)
        } else {
            setCampaignName('')
        }
    }, [assigneeName, type, version, setCampaignName])

    return (
        <div style={{ marginBottom: 24, fontFamily: 'sans-serif' }}>
            <h2>1️⃣ Campaign Details</h2>

            <label style={{ display: 'block', marginBottom: 12 }}>
                Facilitator<br />
                {isLoading ? (
                    <select disabled style={{ width: '100%', padding: 8 }}>
                        <option>Loading…</option>
                    </select>
                ) : (
                    <select
                        value={facilitatorId}
                        onChange={e => setFacilitatorId(e.target.value)}
                        style={{ width: '100%', padding: 8, fontSize: '1rem' }}
                    >
                        <option value="" disabled>— select facilitator —</option>
                        {facilitators.map(f => (
                            <option key={f.id} value={f.id}>
                                {f.name}
                            </option>
                        ))}
                    </select>
                )}
            </label>

            <label style={{ display: 'block', marginBottom: 12 }}>
                Assignee Name<br />
                <input
                    type="text"
                    value={assigneeName}
                    onChange={e => setAssigneeName(e.target.value)}
                    style={{ width: '100%', padding: 8, fontSize: '1rem' }}
                />
            </label>

            <label style={{ display: 'block', marginBottom: 12 }}>
                Type<br />
                <select
                    value={type}
                    onChange={e => setType(e.target.value)}
                    style={{ width: '100%', padding: 8, fontSize: '1rem' }}
                >
                    <option value="">— select type —</option>
                    <option value="business_card">Business Card</option>
                </select>
            </label>

            <label style={{ display: 'block', marginBottom: 20 }}>
                Version<br />
                <input
                    type="text"
                    value={version}
                    onChange={e => setVersion(e.target.value)}
                    style={{ width: '100%', padding: 8, fontSize: '1rem' }}
                />
            </label>
        </div>
    )
}

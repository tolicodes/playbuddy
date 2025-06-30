import Papa from 'papaparse'

type CreateBranchCSVParams = {
    campaignName: string
    ogDescription: string
}[]

export const createBranchCSV = (links: CreateBranchCSVParams) => {
   const branchRecords = links.map(link => {
        const data = {
            $marketing_title: link.campaignName,
            $og_description: link.ogDescription
        }
        return {
            campaign: link.campaignName,
            data: JSON.stringify(data),
            channel: '',
            feature: '',
            stage: '',
            tags: '',
            alias: '',
        }
    })
        // Stringify to CSV
    const csv = Papa.unparse(branchRecords, { header: true })

    // Trigger browser download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'branch_bulk_links.csv'
    a.click()
    URL.revokeObjectURL(url)
}
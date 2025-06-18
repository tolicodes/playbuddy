import CampaignTitleForm from "./CampaignTitleBuilder";
import { useState } from "react";
import BulkLinkCsvGenerator from "./BulkLinkCsvGenerator";
import BranchExtractor from "./BranchExtractor";
import BusinessCardUploader from "./BusinessCardUploader";
import { RectCoords } from "./CardSelector";
import AssetDownloader from "./AssetDownloader";
import { Mapping } from "./AssetDownloader";
import { CreateDBRecords } from "./CreateDBRecords";

export default function PrintRunsAdmin() {
  const [campaignName, setCampaignName] = useState('');
  const [assigneeName, setAssigneeName] = useState<string>('')
  const [version, setVersion] = useState<string>('')
  const [type, setType] = useState<string>('')
  const [facilitatorId, setFacilitatorId] = useState<string>('')

  const [startNumber, setStartNumber] = useState<number>(201)
  const [count, setCount] = useState<number>(1)

  const [mappings, setMappings] = useState<Mapping[]>([])
  const [frontUrl, setFrontUrl] = useState<string>("")
  const [backUrl, setBackUrl] = useState<string>("")
  const [qr, setQr] = useState<RectCoords | null>(null)

  return (
    <div>
      <h1>Print Runs Admin</h1>
      <CampaignTitleForm
        assigneeName={assigneeName}
        version={version}
        facilitatorId={facilitatorId}
        type={type}
        setType={setType}
        setCampaignName={setCampaignName}
        setAssigneeName={setAssigneeName}
        setVersion={setVersion}
        setFacilitatorId={setFacilitatorId}
      />

      <BulkLinkCsvGenerator
        campaignName={campaignName}
        startNumber={startNumber}
        setCount={setCount}
        count={count}
        setStartNumber={setStartNumber}
        assignee={assigneeName}
      />

      <BranchExtractor
        assignee={assigneeName}
        version={version}
        startNumber={startNumber}
        count={count}
        onExtract={setMappings}
      />

      <BusinessCardUploader
        onComplete={(frontUrl, backUrl, qr) => {
          setFrontUrl(frontUrl)
          setBackUrl(backUrl)
          setQr(qr)
        }}
      />

      <AssetDownloader
        mappings={mappings}
        frontUrl={frontUrl}
        backUrl={backUrl}
        sizesConfig={qr ? [{ flyer_name: 'business_card', type: 'business_card', qr_width: qr.width, qr_height: qr.height, qr_x: qr.x, qr_y: qr.y }] : []}
        onAssetsGenerated={(assets: any) => {
          console.log('Assets generated:', assets)
        }}
      />

      <CreateDBRecords
        mappings={mappings}
        campaignName={campaignName}
        type={type}
        facilitatorId={facilitatorId}
      />
    </div>
  )
}
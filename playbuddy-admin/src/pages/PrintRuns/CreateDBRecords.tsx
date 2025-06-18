import React from 'react';
import { useCreateFacilitatorPrintRunDeepLinks } from '../../common/db-axios/useMarketing';
import { Mapping } from './AssetDownloader';

interface CreateDBRecordsProps {
    mappings: Mapping[];
    campaignName: string;
    type: string;
    facilitatorId: string;
}

export const CreateDBRecords: React.FC<CreateDBRecordsProps> = ({
    mappings,
    campaignName,
    type = 'facilitator_profile',
    facilitatorId,
}) => {
    const payload = {
        campaignName,
        type,
        facilitatorId: facilitatorId,
        mappings: mappings.map((mapping) => ({
            printRunAssetNumber: mapping.printRunAssetNumber,
            slug: mapping.code
        }))
    };

    console.log('payload', payload)

    const mutation = useCreateFacilitatorPrintRunDeepLinks(payload);

    return (
        <div className="p-4 border rounded-xl shadow-md">
            <h2 className="text-lg font-bold mb-2">📇 Create Deep Link Records</h2>

            <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
                {mutation.isPending ? 'Creating...' : 'Create Records'}
            </button>

            {mutation.isSuccess && (
                <p className="mt-2 text-green-600">✅ Records created successfully!</p>
            )}

            {mutation.isError && (
                <p className="mt-2 text-red-600">❌ Error: {(mutation.error as any)?.message}</p>
            )}
        </div>
    );
};

import axios from 'axios';

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const CLOUDFLARE_STREAM_API_TOKEN = process.env.CLOUDFLARE_STREAM_API_TOKEN!;

export async function uploadSupabaseVideoToCloudflareViaCopy(
  supabaseVideoUrl: string,
  videoName: string
) {
  const response = await axios.post(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/copy`,
    {
      url: supabaseVideoUrl,
      meta: {
        name: videoName,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.data.success) {
    throw new Error(`Upload failed: ${JSON.stringify(response.data.errors)}`);
  }

  const result = response.data.result;

  return {
    uid: result.uid,
    status: result.status, // 'queued' | 'downloading' | 'ready'
    thumbnail: `https://videodelivery.net/${result.uid}/thumbnails/thumbnail.jpg?time=2s`,
    hlsUrl: `https://videodelivery.net/${result.uid}/manifest/video.m3u8`,
    directPlaybackUrl: `https://watch.videodelivery.net/${result.uid}`,
  };
}

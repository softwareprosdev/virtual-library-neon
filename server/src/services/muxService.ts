import Mux from '@mux/mux-node';

// Initialize Mux client
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!
});

const { video: Video } = mux;

export interface MuxAsset {
  id: string;
  playbackId: string;
  status: string;
  duration?: number;
  aspectRatio?: string;
  resolution?: {
    width: number;
    height: number;
  };
}

export interface MuxUploadUrl {
  id: string;
  url: string;
}

/**
 * Create a direct upload URL for client-side video uploads
 * This allows users to upload directly to Mux without going through your server
 */
export async function createDirectUpload(): Promise<MuxUploadUrl> {
  const upload = await Video.uploads.create({
    cors_origin: process.env.CLIENT_URL || '*',
    new_asset_settings: {
      playback_policy: ['public'],
      encoding_tier: 'baseline', // Use 'smart' for better quality/compression
      video_quality: 'basic' // Options: basic, plus (paid feature)
    }
  });

  return {
    id: upload.id,
    url: upload.url
  };
}

/**
 * Create an asset from a URL (for server-side uploads)
 */
export async function createAssetFromUrl(videoUrl: string): Promise<MuxAsset> {
  const asset = await Video.assets.create({
    input: [{ url: videoUrl }],
    playback_policy: ['public'],
    encoding_tier: 'baseline'
  });

  // Get the playback ID
  const playbackId = asset.playback_ids?.[0]?.id || '';

  return {
    id: asset.id,
    playbackId,
    status: asset.status || 'preparing',
    duration: asset.duration,
    aspectRatio: asset.aspect_ratio
  };
}

/**
 * Get asset details
 */
export async function getAsset(assetId: string): Promise<MuxAsset | null> {
  try {
    const asset = await Video.assets.retrieve(assetId);
    const playbackId = asset.playback_ids?.[0]?.id || '';

    return {
      id: asset.id,
      playbackId,
      status: asset.status || 'unknown',
      duration: asset.duration,
      aspectRatio: asset.aspect_ratio,
      resolution: asset.resolution_tier ? undefined : undefined // Add if needed
    };
  } catch (error) {
    console.error('Error getting Mux asset:', error);
    return null;
  }
}

/**
 * Get upload status
 */
export async function getUploadStatus(uploadId: string): Promise<{
  status: string;
  assetId?: string;
}> {
  try {
    const upload = await Video.uploads.retrieve(uploadId);
    return {
      status: upload.status || 'unknown',
      assetId: upload.asset_id
    };
  } catch (error) {
    console.error('Error getting upload status:', error);
    return { status: 'error' };
  }
}

/**
 * Delete an asset
 */
export async function deleteAsset(assetId: string): Promise<boolean> {
  try {
    await Video.assets.delete(assetId);
    return true;
  } catch (error) {
    console.error('Error deleting Mux asset:', error);
    return false;
  }
}

/**
 * Generate playback URL from playback ID
 */
export function getPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

/**
 * Generate thumbnail URL from playback ID
 */
export function getThumbnailUrl(playbackId: string, options?: {
  width?: number;
  height?: number;
  time?: number;
  fit?: 'preserve' | 'crop' | 'smartcrop';
}): string {
  const params = new URLSearchParams();
  if (options?.width) params.append('width', options.width.toString());
  if (options?.height) params.append('height', options.height.toString());
  if (options?.time) params.append('time', options.time.toString());
  if (options?.fit) params.append('fit_mode', options.fit);

  const queryString = params.toString();
  return `https://image.mux.com/${playbackId}/thumbnail.png${queryString ? `?${queryString}` : ''}`;
}

/**
 * Generate animated GIF URL from playback ID
 */
export function getGifUrl(playbackId: string, options?: {
  start?: number;
  end?: number;
  width?: number;
  fps?: number;
}): string {
  const params = new URLSearchParams();
  if (options?.start !== undefined) params.append('start', options.start.toString());
  if (options?.end !== undefined) params.append('end', options.end.toString());
  if (options?.width) params.append('width', options.width.toString());
  if (options?.fps) params.append('fps', options.fps.toString());

  const queryString = params.toString();
  return `https://image.mux.com/${playbackId}/animated.gif${queryString ? `?${queryString}` : ''}`;
}

/**
 * Generate a signed URL for a private video (if using signed playback)
 */
export async function getSignedPlaybackUrl(playbackId: string): Promise<string> {
  // Only needed if you enable signed playback URLs in Mux
  // For now, we're using public playback URLs
  return getPlaybackUrl(playbackId);
}

export default {
  createDirectUpload,
  createAssetFromUrl,
  getAsset,
  getUploadStatus,
  deleteAsset,
  getPlaybackUrl,
  getThumbnailUrl,
  getGifUrl,
  getSignedPlaybackUrl
};

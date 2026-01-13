import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import muxService from '../services/muxService';
import Mux from '@mux/mux-node';

// Mock Mux
jest.mock('@mux/mux-node', () => {
  return jest.fn().mockImplementation(() => {
    return {
      video: {
        uploads: {
          create: jest.fn().mockResolvedValue({ id: 'upload-id', url: 'https://upload.url' } as never),
          retrieve: jest.fn().mockResolvedValue({ status: 'ready', asset_id: 'asset-id' } as never)
        },
        assets: {
          create: jest.fn().mockResolvedValue({
            id: 'asset-id',
            playback_ids: [{ id: 'playback-id' }],
            status: 'ready',
            duration: 100,
            aspect_ratio: '16:9'
          } as never),
          retrieve: jest.fn().mockResolvedValue({
             id: 'asset-id',
            playback_ids: [{ id: 'playback-id' }],
            status: 'ready',
            duration: 100,
            aspect_ratio: '16:9'
          } as never),
          delete: jest.fn().mockResolvedValue({} as never)
        }
      }
    };
  });
});

describe('Mux Service', () => {
  beforeEach(() => {
    process.env.MUX_TOKEN_ID = 'test-token-id';
    process.env.MUX_TOKEN_SECRET = 'test-token-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(muxService).toBeDefined();
  });

  it('should create direct upload', async () => {
    const result = await muxService.createDirectUpload();
    expect(result).toEqual({ id: 'upload-id', url: 'https://upload.url' });
  });

  it('should create asset from url', async () => {
    const result = await muxService.createAssetFromUrl('https://example.com/video.mp4');
    expect(result).toEqual({
      id: 'asset-id',
      playbackId: 'playback-id',
      status: 'ready',
      duration: 100,
      aspectRatio: '16:9'
    });
  });

  it('should get asset', async () => {
    const result = await muxService.getAsset('asset-id');
     expect(result).toEqual({
      id: 'asset-id',
      playbackId: 'playback-id',
      status: 'ready',
      duration: 100,
      aspectRatio: '16:9'
    });
  });

  it('should get upload status', async () => {
    const result = await muxService.getUploadStatus('upload-id');
    expect(result).toEqual({ status: 'ready', assetId: 'asset-id' });
  });

  it('should delete asset', async () => {
    const result = await muxService.deleteAsset('asset-id');
    expect(result).toBe(true);
  });

  it('should get playback url', () => {
    const url = muxService.getPlaybackUrl('playback-id');
    expect(url).toBe('https://stream.mux.com/playback-id.m3u8');
  });

  it('should get thumbnail url', () => {
    const url = muxService.getThumbnailUrl('playback-id');
    expect(url).toBe('https://image.mux.com/playback-id/thumbnail.png');
  });

   it('should get thumbnail url with options', () => {
    const url = muxService.getThumbnailUrl('playback-id', { width: 100, height: 100 });
    expect(url).toBe('https://image.mux.com/playback-id/thumbnail.png?width=100&height=100');
  });
});

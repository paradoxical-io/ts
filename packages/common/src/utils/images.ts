import { Base64Image, Base64ImageUri } from '@paradoxical-io/types';

export interface ImageData {
  height: number;
  width: number;
  mime: string;
  base64: Base64Image;
}

export function toBase64ImageUri(data: Pick<ImageData, 'mime' | 'base64'>): Base64ImageUri {
  return `data:${data.mime};base64,${data.base64}` as Base64ImageUri;
}

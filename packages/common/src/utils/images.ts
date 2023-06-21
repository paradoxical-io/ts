export interface ImageData {
  height: number;
  width: number;
  mime: string;
  base64: string;
}

export function toBase64ImageUri(data: Pick<ImageData, 'mime' | 'base64'>): string {
  return `data:${data.mime};base64,${data.base64}`;
}

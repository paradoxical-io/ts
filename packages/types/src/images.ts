import { Base64Image } from './brands';

export interface ImageData {
  height: number;
  width: number;
  mime: string;
  base64: Base64Image;
}

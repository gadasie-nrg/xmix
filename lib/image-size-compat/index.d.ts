export interface ImageSize {
  width: number;
  height: number;
  type?: string;
  orientation?: number;
  images?: ImageSize[];
}

declare function imageSize(input: string | Uint8Array): ImageSize;

export default imageSize;
export { imageSize };
export type ImageProviderName = "nano-banana" | "modelgate";

export interface ImageGenerateInput {
  prompt: string;
  aspectRatio?: string;
  imageSize?: string;
  timeoutMs?: number;
}

export interface ImageGenerateClient {
  readonly provider: ImageProviderName;
  readonly model: string;
  isAvailable(): boolean;
  generate(input: ImageGenerateInput): Promise<string | null>;
}

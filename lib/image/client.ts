import { ModelGateImageClient } from "@/lib/image/modelgate";
import { NanoBananaClient } from "@/lib/image/nano-banana";
import type { ImageGenerateClient } from "@/lib/image/types";
import type { LlmProviderSelection } from "@/types";

function isModelGateImageConfigured(): boolean {
  return Boolean(process.env.MODELGATE_IMAGE_API_KEY || process.env.MODELGATE_API_KEY);
}

export function createImageClient(preferredTextProvider: LlmProviderSelection): ImageGenerateClient | null {
  const modelgateClient = new ModelGateImageClient();
  const nanoClient = new NanoBananaClient();

  const preferredOrder: ImageGenerateClient[] = [];
  if (preferredTextProvider === "modelgate") {
    preferredOrder.push(modelgateClient, nanoClient);
  } else if (isModelGateImageConfigured()) {
    preferredOrder.push(modelgateClient, nanoClient);
  } else {
    preferredOrder.push(nanoClient);
  }

  for (const client of preferredOrder) {
    if (client.isAvailable()) {
      return client;
    }
  }
  return null;
}

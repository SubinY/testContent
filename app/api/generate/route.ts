import { z } from "zod";

import { fail, ok } from "@/lib/services/api-response";
import {
  createGenerateStreamResponse,
  GenerateInputError,
  generateTestContent
} from "@/lib/services/generate-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const STYLE_LABELS = ["A", "B", "C", "D", "E"] as const;

const requestSchema = z.object({
  topic: z.string().trim().min(2).max(120),
  count: z.number().int().min(1).max(5).optional(),
  enableImageVariants: z.boolean().optional(),
  strictRemote: z.boolean().optional(),
  qualityGateEnabled: z.boolean().optional(),
  provider: z.enum(["auto", "openai", "deepseek", "modelgate", "local"]).optional(),
  variantInputMode: z.enum(["draw", "select"]).optional(),
  selectedVariantLabel: z.enum(STYLE_LABELS).optional(),
  stream: z.boolean().optional()
});

export async function POST(request: Request): Promise<Response> {
  const payload = await request.json().catch(() => null);
  const parsedBody = requestSchema.safeParse(payload);

  if (!parsedBody.success) {
    return Response.json(fail("INVALID_PARAMS", "请求参数不合法。"), { status: 400 });
  }

  const { stream: wantStream = true, ...params } = parsedBody.data;

  try {
    if (wantStream) {
      return createGenerateStreamResponse(params);
    }
    const test = await generateTestContent(params);
    return Response.json(ok(test));
  } catch (error) {
    if (error instanceof GenerateInputError) {
      return Response.json(fail("INVALID_PARAMS", error.message), { status: 400 });
    }
    return Response.json(
      fail("UNKNOWN_ERROR", error instanceof Error ? error.message : "生成失败，请稍后重试。"),
      { status: 500 }
    );
  }
}

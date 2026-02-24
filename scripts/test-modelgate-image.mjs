/**
 * 测试 ModelGate 图片生成 API（参考 https://docs.modelgate.net/guide/api/image.html）
 * 用法：在项目根目录执行，先设置环境变量
 *   set MODELGATE_IMAGE_API_KEY=your-key && node scripts/test-modelgate-image.mjs
 *   MODELGATE_IMAGE_API_KEY=your-key node scripts/test-modelgate-image.mjs
 * 或使用 MODELGATE_API_KEY 亦可
 *
 * 文档说明：output_type 为 "url" 时返回图片 URL；为 "base64" 时返回 data[].content（data:image/png;base64,...）
 */

const apiKey = process.env.MODELGATE_IMAGE_API_KEY || process.env.MODELGATE_API_KEY;
if (!apiKey) {
  console.error("请设置环境变量 MODELGATE_IMAGE_API_KEY 或 MODELGATE_API_KEY");
  process.exit(1);
}

const url = "https://mg.aid.pub/api/v1/images/generations";
const headers = {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json"
};

// 请求 URL 格式的图片（文档：output_type: "url" 时 data[0].url 为图片地址）
const payload = {
  model: "google/nano-banana",
  prompt: "A cat wearing a spacesuit",
  size: "1024x1024",
  output_type: "url",
  output_format: "png"
};

console.log("=== ModelGate 图像 API 测试（获取图片 URL）===");
console.log("请求 URL:", url);
console.log("请求体:", JSON.stringify(payload, null, 2));
console.log("");

try {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  console.log("HTTP 状态:", response.status, response.statusText);
  console.log("响应体长度:", text.length);

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.log("响应体 (前 500 字符):", text.slice(0, 500));
    process.exit(response.ok ? 0 : 1);
  }

  if (!response.ok) {
    console.log("错误响应:", JSON.stringify(json, null, 2));
    process.exit(1);
  }

  // 文档：成功时 status === "completed"，URL 格式时 data[0].url
  const status = json.status;
  const first = Array.isArray(json.data) ? json.data[0] : null;

  console.log("响应 status:", status);
  console.log("data[0] keys:", first ? Object.keys(first) : "无");

  if (status === "error") {
    const msg = json.message?.error?.message || json.message || JSON.stringify(json.message);
    console.error("API 返回错误:", msg);
    process.exit(1);
  }

  const imageUrl = first?.url;
  if (imageUrl) {
    console.log("");
    console.log("✓ 成功获取图片 URL:");
    console.log(imageUrl);
  } else {
    // base64 时文档为 data[0].content（data:image/png;base64,...）
    const content = first?.content;
    if (content) {
      console.log("");
      console.log("⚠ 当前为 base64 格式，未返回 url。若需 URL 请使用 output_type: 'url'");
      console.log("content 长度:", content.length);
    } else {
      console.log("");
      console.log("未识别到 data[0].url 或 data[0].content，完整 data[0]:", JSON.stringify(first, null, 2).slice(0, 300));
    }
  }
} catch (err) {
  console.error("请求异常:", err.message);
  process.exit(1);
}












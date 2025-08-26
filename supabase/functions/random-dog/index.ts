import { serveEdgeFunction } from "../_shared/edgeFunction.ts";
import { corsHeaders } from "../_shared/cors.ts";

// 随机狗狗图片转发函数
// - 来源 API: https://dog.ceo/api/breeds/image/random
// - 本函数仅作为简单转发：调用上游获取随机图片 JSON，原样返回给客户端
// - 采用共享基座：统一 CORS、错误结构、自动 Deno.serve
// - 详细中文日志：方便在 Supabase 控制台查看执行轨迹

serveEdgeFunction(async ({ req }) => {
  const requestStartAt = Date.now();
  const upstreamUrl = "https://dog.ceo/api/breeds/image/random";

  // 仅允许 GET 方法（预检 OPTIONS 已由共享层处理）
  if (req.method !== "GET") {
    console.warn("[random-dog] 非 GET 请求被拒绝", { method: req.method, url: req.url });
    throw new Error("仅支持 GET 方法");
  }

  console.info("[random-dog] 开始请求上游 dog.ceo", {
    upstreamUrl,
    requestUrl: req.url,
    method: req.method,
  });

  // 调用上游 API 获取随机狗狗图片
  const upstreamResponse = await fetch(upstreamUrl, {
    method: "GET",
    headers: {
      // 尽量贴近示例请求头；无需强制，但可提升兼容性
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate",
      Connection: "keep-alive",
      "User-Agent": "Supabase-EdgeFunction/RandomDog",
    },
  });

  const elapsedMs = Date.now() - requestStartAt;
  console.info("[random-dog] 上游响应返回", {
    status: upstreamResponse.status,
    ok: upstreamResponse.ok,
    elapsedMs,
  });

  if (!upstreamResponse.ok) {
    // 统一交给共享层格式化错误
    throw new Error(`上游服务返回错误状态: ${upstreamResponse.status}`);
  }

  // 上游返回为 application/json；此处解析后再原样转发
  const data = await upstreamResponse.json();
  console.info("[random-dog] 即将返回给客户端的数据", data);

  return new Response(JSON.stringify(data), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
});



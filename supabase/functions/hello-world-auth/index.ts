import { serveEdgeFunction } from "../_shared/edgeFunction.ts";
import { corsHeaders } from "../_shared/cors.ts";

// 需要登录的 Hello World 示例
// - 使用 serveEdgeFunction：自动 Deno.serve、CORS 预检、统一错误返回
// - 显式 { requireAuth: true }：包装层强制校验，未登录直接返回错误 JSON
// - 注入 user：已登录用户对象（包含 email 等）

serveEdgeFunction(async ({ req, supabaseService, user }) => {
  const body = { message: `Hello (auth), ${user.email}!` };
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}, { requireAuth: true });



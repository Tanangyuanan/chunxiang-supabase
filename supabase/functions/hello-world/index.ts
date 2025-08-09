import { serveEdgeFunction } from "../_shared/edgeFunction.ts";
import { corsHeaders } from "../_shared/cors.ts";

// 一个最小可用的 Hello World 云函数示例
// - 使用 serveEdgeFunction：自带 Deno.serve、自动处理 OPTIONS、统一错误返回
// - 自动注入 supabase 与可选的 user（未登录时为 null）
// - 返回 JSON，并带上 CORS 头

serveEdgeFunction(async ({ req, supabaseService }) => {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") ?? "World";

  // 演示：即使这里未使用 supabase，也已被注入可直接调用
  // const { data } = await supabaseService.from('table').select('*').limit(1);

  const body = { message: `Hello, ${name}!` };
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}, { requireAuth: false });



本项目为 Supabase Edge Functions（Deno）共享基础层，供各业务云函数复用：

1) cors.ts
- 提供 `corsHeaders` 以复用跨域响应头，预检与错误响应由 `edgeFunction` 统一兜底。

2) edgeFunction.ts
- 能力（MVP 仅保留新方式）：
  - `serveEdgeFunction(handler, options?)`: 内置 `Deno.serve`，自动注入 `supabaseService`（Service Role 客户端），可选强制认证；
  - 统一错误结构 `{ error: { message } }`，错误响应带 `corsHeaders`。

3) supabaseClient.ts
- `getSupabaseClient()` 通过 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY` 初始化服务端客户端。
- 用于受信任的边缘函数（非前端）。

4) auth.ts
- `authenticateUser(supabase, req)`：仅从 `Authorization: Bearer <token>` 读取 token，返回 `{ user, isAuthenticated, error }`。
- `requireAuth(supabase, req)`：未认证抛错，认证通过返回 `user`。

使用建议
- 必须登录：用 `requireAuth`。
- 可选登录：用 `authenticateUser`，按需分支处理。
- 业务失败：直接 `throw new Error('message')`，交给 `edgeFunction` 统一格式化。

推荐示例（自动 `Deno.serve` + 可选认证 + 注入 supabaseService/user）：

```ts
import { serveEdgeFunction } from "../_shared/edgeFunction.ts";
import { corsHeaders } from "../_shared/cors.ts";

serveEdgeFunction(async ({ req, supabaseService, user }) => {
  return new Response(JSON.stringify({ ok: true, user: !!user }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```



## `_shared` 目录说明（Supabase Edge Functions / Deno）

此目录包含云函数之间可复用的基础能力与约定，目标是：

- 最小但足够：只提供最常用的边缘能力（CORS、统一错误边界、服务端 Supabase 客户端、认证校验）。
- 明确边界：业务函数只关注业务逻辑，通用问题统一在共享层解决。
- 可组合：按需引入，不强制耦合。

### 文件与职责

- `cors.ts`：集中定义跨域响应头 `corsHeaders`。
  - 作用：处理浏览器跨域预检（OPTIONS）与业务响应时的跨域头复用。
  - 约定：业务响应必须返回 `Content-Type` 与 `corsHeaders`（`edgeFunction` 仅对错误时兜底加头）。

- `edgeFunction.ts`：统一请求入口能力（仅保留新方式）。
  - `serveEdgeFunction(handler, options?)`：内置 `Deno.serve`。
    - 自动 `Deno.serve`（非 Deno 环境回退 `addEventListener('fetch')` 以便测试）；
    - 自动处理 `OPTIONS` 预检；
    - 自动注入 `supabaseService`（Service Role 客户端）；
    - 可选强制认证：`options.requireAuth === true` 时自动调用 `requireAuth` 并注入 `user`；否则不注入 `user`；
    - 统一错误返回结构 `{ error: { message } }`，并带 `corsHeaders`。
  - 说明：为了 MVP 精简，已移除旧的 `createEdgeFunction`。

- `supabaseClient.ts`：以 Service Role Key 创建服务端 Supabase 客户端。
  - 作用：在 Edge Functions 中执行需要管理员权限的服务端操作。
  - 环境变量：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`（部署端配置）。
  - 注意：仅用于受信任的 Edge Functions，切勿下发到前端。

- `auth.ts`：认证辅助方法。
  - `authenticateUser(supabase, req)`：从 `Authorization: Bearer <token>` 读取 token，调用 `supabase.auth.getUser(token)` 验证；返回 `{ user, isAuthenticated, error }`。
  - `requireAuth(supabase, req)`：未认证直接抛错；认证通过返回 `user`。
  - 建议：需要强登录的接口用 `requireAuth`，可选登录场景用 `authenticateUser`。

### 设计要点

- 统一错误边界：`createEdgeFunction` 与 `serveEdgeFunction` 均会捕获未处理异常并输出统一 JSON 结构，便于前端稳定解析。
- CORS 一致性：预检与错误响应由框架兜底，业务成功响应需手动合并 `corsHeaders`。
- 显式依赖：业务函数对 Supabase 的访问通过 `getSupabaseClient()` 获取，便于切换、测试与注入。

### 使用示例

推荐用法（自动 `Deno.serve`、自动注入 `supabaseService`、按需注入 `user`）：

```ts
import { serveEdgeFunction } from "../_shared/edgeFunction.ts";
import { corsHeaders } from "../_shared/cors.ts";

// 强制要求登录：{ requireAuth: true }
serveEdgeFunction(async ({ req, supabaseService, user }) => {
  // user 一定存在，supabaseService 为服务角色客户端
  const data = { hello: user.email };
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}, { requireAuth: true });
```

（已删除旧版兼容示例）

### 错误处理约定

- 业务逻辑中遇到失败：`throw new Error("描述性错误信息")`。
- `createEdgeFunction` / `serveEdgeFunction` 会返回如下结构（示例）：

```json
{
  "error": { "message": "请先登录" }
}
```

### 安全与部署

- 请在服务端配置 `SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY` 环境变量。
- 不要在前端或公共仓库泄露 Service Role Key。
- 本目录适配 Supabase Edge Runtime（Deno）。



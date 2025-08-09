# Chunxiang Supabase Edge Functions MVP（Deno）

一个可直接复用的 Supabase Edge Functions（Deno）最小可用框架，内置统一入口包装：CORS 预检、统一错误结构、服务端 Supabase 客户端注入（Service Role）、可选强制认证。

- 唯一入口工具：`serveEdgeFunction`
- 代码位置：`supabase/functions/_shared/`
- 示例：
  - 无需登录：`supabase/functions/hello-world/index.ts`
  - 需要登录：`supabase/functions/hello-world-auth/index.ts`

## 目录结构

```
./supabase/
  functions/
    _shared/
      auth.ts              # 认证辅助（仅支持 Authorization: Bearer <token>）
      cors.ts              # 统一 CORS 头（corsHeaders）
      edgeFunction.ts      # 唯一入口 serveEdgeFunction（自动 Deno.serve + 注入 supabaseService + 可选 requireAuth）
      supabaseClient.ts    # 服务端 Supabase 客户端（Service Role）
    hello-world/
      index.ts             # 无需登录示例（requireAuth: false）
    hello-world-auth/
      index.ts             # 需要登录示例（requireAuth: true）
```

## 快速开始（macOS）

### 1) 安装 VS Code 插件
- 安装 Deno 官方插件：Denoland 出品（ID: `denoland.vscode-deno`）
- 在工作区启用 Deno（两种方式均可）：
  1. 命令面板 → “Deno: Initialize Workspace Configuration”
  2. 或在工作区 `.vscode/settings.json` 中添加：
     ```json
     {
       "deno.enable": true,
       "deno.lint": true,
       "deno.unstable": true
     }
     ```
- 可选：安装 TypeScript Nightly（ID: `ms-vscode.vscode-typescript-next`）以获得更快的类型支持。

### 2) 安装 Docker（两种任选其一）
- 方案 A：Docker Desktop
  - 安装：`brew install --cask docker`
  - 启动：`open -a Docker`（首次启动需要授权；等待右上角鲸鱼图标常亮）
- 方案 B：Colima（轻量替代）
  - 安装：`brew install colima docker`
  - 启动：`colima start`

### 3) 安装 Supabase CLI
```bash
brew install supabase/tap/supabase
supabase --version
```

### 4) 准备环境变量
框架会从环境变量读取服务端凭据（仅服务端使用）：
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

推荐做法：
- 本地：在 `supabase/.env` 写入（注意不要提交到仓库）
  ```bash
  SUPABASE_URL=...              # 你的项目 URL（如 https://xxxx.supabase.co）
  SUPABASE_SERVICE_ROLE_KEY=... # 你的 Service Role Key
  ```
- 线上：使用 Supabase 项目 Secrets（见下方“部署”）

## 本地开发

### 运行无需登录示例（hello-world）
```bash
supabase functions serve hello-world --env-file ./supabase/.env
```
- 调用示例：
  ```bash
  curl -i "http://127.0.0.1:54321/functions/v1/hello-world?name=Claude"
  ```

### 运行需要登录示例（hello-world-auth）
```bash
supabase functions serve hello-world-auth --env-file ./supabase/.env
```
- 调用示例（需携带用户的 Access Token）：
  ```bash
  curl -i \
    -H "Authorization: Bearer <USER_ACCESS_TOKEN>" \
    "http://127.0.0.1:54321/functions/v1/hello-world-auth"
  ```

## 编写你的云函数

只使用 `serveEdgeFunction` 作为唯一入口。

- 无需登录（推荐默认）：
  ```ts
  import { serveEdgeFunction } from "../_shared/edgeFunction.ts";
  import { corsHeaders } from "../_shared/cors.ts";

  serveEdgeFunction(async ({ req, supabaseService }) => {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name") ?? "World";
    return new Response(JSON.stringify({ message: `Hello, ${name}!` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }, { requireAuth: false });
  ```

- 需要登录：
  ```ts
  import { serveEdgeFunction } from "../_shared/edgeFunction.ts";
  import { corsHeaders } from "../_shared/cors.ts";

  serveEdgeFunction(async ({ req, supabaseService, user }) => {
    return new Response(JSON.stringify({ message: `Hello (auth), ${user.email}!` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }, { requireAuth: true });
  ```

约定与注意：
- 成功响应必须带上 `corsHeaders` 与 `Content-Type: application/json`。
- 业务失败：直接 `throw new Error('描述性错误')`，包装层会统一返回 `{ error: { message } }`。
- 仅支持 `Authorization: Bearer <token>`；客户端切勿使用 Service Role Key。

## 一键部署到 Supabase

### 1) 登录并关联项目
```bash
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
```
- 项目 Ref 可在 Supabase 控制台的项目设置中找到。

### 2) 配置项目 Secrets（线上环境变量）
```bash
supabase secrets set \
  SUPABASE_URL="https://xxxx.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="<YOUR_SERVICE_ROLE_KEY>"
```

### 3) 部署函数
```bash
# 单个函数
supabase functions deploy hello-world
supabase functions deploy hello-world-auth

# 或部署某个目录下所有变更函数（可选）
# supabase functions deploy --all
```

### 4) 线上调用
```bash
# 无需登录
curl -i "https://<PROJECT_REF>.functions.supabase.co/hello-world?name=World"

# 需要登录
curl -i \
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>" \
  "https://<PROJECT_REF>.functions.supabase.co/hello-world-auth"
```

## VS Code / Deno 常见问题
- 如果提示找不到名称 `Deno` 或类型定义缺失，确认：
  - 已安装并启用 Deno 插件（工作区级别）
  - 已执行 “Deno: Initialize Workspace Configuration”
  - `deno.enable` 为 `true`
- 如果跨域失败，检查业务成功响应是否合并了 `corsHeaders`。
- 如果认证失败，检查请求头是否包含正确的 `Authorization: Bearer <token>`。

## 安全提示
- Service Role Key 仅在服务端使用，切勿下发到前端或暴露在客户端代码中。
- 线上请使用 `supabase secrets` 管理环境变量；本地使用 `.env` 文件但不要提交到仓库。

## 许可
MIT



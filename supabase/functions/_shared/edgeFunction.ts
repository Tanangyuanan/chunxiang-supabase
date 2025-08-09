import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "./cors.ts";
import { getSupabaseClient } from "./supabaseClient.ts";
import { authenticateUser, requireAuth } from "./auth.ts";

// 自带 Deno.serve，自动处理 CORS、注入 Supabase Service Role 客户端，支持可选强制认证
export function serveEdgeFunction(
  handler: (ctx: { req: Request; supabaseService: any; user: any }) => Promise<Response>,
  options: { requireAuth: true }
): void;
export function serveEdgeFunction(
  handler: (ctx: { req: Request; supabaseService: any }) => Promise<Response>,
  options?: { requireAuth?: false }
): void;
export function serveEdgeFunction(
  handler: any,
  options?: { requireAuth?: boolean },
): void {
  const handle = async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    const supabaseService = getSupabaseClient();
    try {
      if (options?.requireAuth) {
        const user = await requireAuth(supabaseService, req);
        return await handler({ req, supabaseService, user });
      }

      // 不要求登录：不注入 user 字段
      return await handler({ req, supabaseService });
    } catch (error) {
      console.error("[Edge Function Error]", error);
      return new Response(
        JSON.stringify({
          error: {
            message: error instanceof Error ? error.message : "未知错误",
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }
  };

  const runtimeDeno = (globalThis as any).Deno;
  if (runtimeDeno && typeof runtimeDeno.serve === "function") {
    runtimeDeno.serve(handle);
  } else {
    addEventListener("fetch", (event: any) => {
      event.respondWith(handle(event.request));
    });
  }
}

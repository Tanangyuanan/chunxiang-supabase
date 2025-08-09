/**
 * 用户认证共享方法
 * 用于验证用户是否已登录并返回用户信息
 */

interface AuthResult {
  user: any;
  isAuthenticated: boolean;
  error?: string;
}

/**
 * 验证用户认证状态
 * @param supabase Supabase客户端实例
 * @param req 请求对象
 * @returns 认证结果
 */
export async function authenticateUser(
  supabase: any,
  req: Request,
): Promise<AuthResult> {
  const result: AuthResult = {
    user: null,
    isAuthenticated: false,
  };

  // 获取认证信息（仅支持 Authorization: Bearer <token>）
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    result.error = "请先登录。";
    return result;
  }

  const authToken = authHeader.replace("Bearer ", "");

  try {
    const { data: { user }, error: authError } = await supabase.auth
      .getUser(authToken);

    if (authError) {
      console.error("[认证错误]", {
        error: authError,
        token: authToken,
      });
      result.error = "请先登录";
      return result;
    }

    if (!user) {
      console.error("[认证错误] 用户信息为空");
      result.error = "请先登录";
      return result;
    }

    result.user = user;
    result.isAuthenticated = true;
    return result;
  } catch (error) {
    console.error("[认证异常]", error);
    result.error = "认证失败";
    return result;
  }
}

/**
 * 要求用户必须已登录的认证方法
 * 如果用户未登录则抛出错误
 * @param supabase Supabase客户端实例
 * @param req 请求对象
 * @returns 用户信息
 */
export async function requireAuth(
  supabase: any,
  req: Request,
): Promise<any> {
  const authResult = await authenticateUser(supabase, req);

  if (!authResult.isAuthenticated) {
    throw new Error(authResult.error || "请先登录");
  }

  return authResult.user;
}

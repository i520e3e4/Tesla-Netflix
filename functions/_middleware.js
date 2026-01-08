export async function onRequest(context) {
    const { request, next } = context;
    const url = new URL(request.url);

    // 只对 /api/ 路径应用 CORS 逻辑
    if (url.pathname.startsWith('/api/')) {
        // 准备 CORS 头
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Max-Age': '86400',
        };

        // 处理 OPTIONS 预检请求 - 直接返回 200 OK
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: corsHeaders
            });
        }

        try {
            // 执行下一个处理器 (如 proxy.js)
            const response = await next();

            // 复制原有响应并添加/覆盖 CORS 头
            const newHeaders = new Headers(response.headers);
            Object.entries(corsHeaders).forEach(([key, value]) => {
                newHeaders.set(key, value);
            });

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders
            });
        } catch (err) {
            // 如果后端发生未捕获错误，也要返回 CORS 头以便前端能看到错误
            return new Response(`Middleware Error: ${err.message}`, {
                status: 500,
                headers: corsHeaders
            });
        }
    }

    // 非 API 请求直接放行
    return next();
}

export async function onRequest(context) {
  const { request } = context;

  // 通用 CORS 头
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);

  // 获取目标 API URL
  let targetUrlStr = url.searchParams.get('url');

  if (!targetUrlStr) {
    return new Response('Missing "url" parameter', {
      status: 400,
      headers: corsHeaders
    });
  }

  // 尝试 Base64 解码 (如果不是以 http 开头，假设是 Base64)
  if (!targetUrlStr.startsWith('http')) {
    try {
      targetUrlStr = atob(targetUrlStr);
    } catch (e) {
      // 解码失败，可能是无效串，保持原样尝试或报错
      console.error('Base64 decode failed', e);
    }
  }

  let targetUrl;
  try {
    targetUrl = new URL(targetUrlStr);
  } catch (e) {
    return new Response('Invalid "url" parameter', {
      status: 400,
      headers: corsHeaders
    });
  }

  // 复制查询参数 (排除 'url' 本身)
  for (const [key, value] of url.searchParams) {
    if (key !== 'url') {
      targetUrl.searchParams.append(key, value);
    }
  }

  // 构建新请求
  // 移除 Referer，只保留 UA
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒后端超时

  const modifiedRequest = new Request(targetUrl, {
    method: request.method,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    signal: controller.signal
  });

  try {
    const response = await fetch(modifiedRequest);
    clearTimeout(timeoutId);

    // 构建响应
    const newHeaders = new Headers(response.headers);
    Object.keys(corsHeaders).forEach(key => newHeaders.set(key, corsHeaders[key]));

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });

  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError';
    return new Response(`Proxy Error: ${isTimeout ? 'Upstream Timeout (8s)' : err.message}`, {
      status: isTimeout ? 504 : 502,
      headers: corsHeaders
    });
  }
}

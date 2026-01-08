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
  const targetUrlStr = url.searchParams.get('url');

  if (!targetUrlStr) {
    return new Response('Missing "url" parameter', {
      status: 400,
      headers: corsHeaders
    });
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
  // 设置 User-Agent 模拟浏览器，并伪造 Referer
  const modifiedRequest = new Request(targetUrl, {
    method: request.method,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': targetUrl.origin
    }
  });

  try {
    const response = await fetch(modifiedRequest);

    // 构建响应
    const newHeaders = new Headers(response.headers);

    // 覆盖/添加 CORS 头
    Object.keys(corsHeaders).forEach(key => newHeaders.set(key, corsHeaders[key]));

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });

  } catch (err) {
    return new Response(`Proxy Error: ${err.message}`, {
      status: 502,
      headers: corsHeaders
    });
  }
}

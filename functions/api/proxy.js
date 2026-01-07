export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  // 获取目标 API URL
  // 前端会传参: /api/proxy?url=https://API_URL&param1=xxx
  const targetUrlStr = url.searchParams.get('url');

  if (!targetUrlStr) {
    return new Response('Missing "url" parameter', { status: 400 });
  }

  // 构建目标请求 URL
  // 此时 searchParams 包含 'url' 和其他业务参数
  // 我们需要把业务参数拼接到 targetUrl 上
  let targetUrl;
  try {
    targetUrl = new URL(targetUrlStr);
  } catch (e) {
    return new Response('Invalid "url" parameter', { status: 400 });
  }

  // 复制所有查询参数到目标 URL (排除 'url' 本身)
  for (const [key, value] of url.searchParams) {
    if (key !== 'url') {
      targetUrl.searchParams.append(key, value);
    }
  }

  // 创建请求
  // 注意：需要设置 User-Agent，防止某些防火墙拦截无 UA 请求
  const modifiedRequest = new Request(targetUrl, {
    method: request.method,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': targetUrl.origin // 伪造 Referer 为目标站点本身
    }
  });

  try {
    const response = await fetch(modifiedRequest);
    
    // 重新构建响应，添加 CORS 头，允许前端访问
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', 'Content-Type');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });

  } catch (err) {
    return new Response(`Proxy Error: ${err.message}`, { status: 502 });
  }
}

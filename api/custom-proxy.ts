import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, method, headers, body } = req.body;

  if (!url) {
    return res.status(400).json({ error: '请提供请求 URL' });
  }

  console.log('[custom-proxy] Request:', { url, method, hasHeaders: !!headers, hasBody: !!body });

  try {
    const requestOptions: RequestInit = {
      method: method || 'GET',
      headers: headers || {},
    };

    if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const startTime = Date.now();
    const response = await fetch(url, requestOptions);
    const endTime = Date.now();

    // Get response as text first
    const responseText = await response.text();
    let responseData: any;

    // Try to parse as JSON
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { _rawText: responseText };
    }

    console.log('[custom-proxy] Response:', response.status, response.statusText);

    // Return response with metadata
    return res.status(response.status).json({
      _meta: {
        status: response.status,
        statusText: response.statusText,
        duration: `${endTime - startTime}ms`,
        headers: Object.fromEntries(response.headers.entries()),
      },
      ...responseData,
    });
  } catch (error: any) {
    console.error('[custom-proxy] Error:', error.message);
    return res.status(500).json({
      error: error.message || '请求失败',
      _meta: { status: 500, statusText: 'Proxy Error' },
    });
  }
}


import type { RequestHandler } from './$types';
import { PUBLIC_CONVEX_SITE_URL } from '$env/static/public';

export const fallback: RequestHandler = async ({ request, params, url }) => {
	// Construct the target Convex URL
	const targetUrl = new URL(`${PUBLIC_CONVEX_SITE_URL}/api/auth/${params.all}${url.search}`);

	// Clone the request headers and ensure host forwarding headers are present
	const headers = new Headers(request.headers);
	headers.set('x-forwarded-host', url.host);
	headers.set('x-forwarded-proto', url.protocol.replace(':', ''));
	headers.delete('host');
	headers.delete('connection');
	headers.delete('accept-encoding');

	let body: ArrayBuffer | undefined = undefined;
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		try {
			body = await request.arrayBuffer();
		} catch (e) {
			console.error('Failed to read request body in auth proxy:', e);
		}
	}

	try {
		// Forward request to Convex
		const res = await fetch(targetUrl, {
			method: request.method,
			headers,
			body,
			redirect: 'manual'
		});

		// Clone response headers (especially Set-Cookie)
		const resHeaders = new Headers(res.headers);
		resHeaders.delete('content-encoding');
		resHeaders.delete('content-length');

		return new Response(res.body, {
			status: res.status,
			statusText: res.statusText,
			headers: resHeaders
		});
	} catch (error) {
		console.error('Auth proxy fetch failed:', error);
		return new Response('Auth proxy error', { status: 502 });
	}
};

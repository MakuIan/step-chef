import { OPENROUTER_API_KEY } from '$env/static/private';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { type RequestHandler, json } from '@sveltejs/kit';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);

export const GET: RequestHandler = async ({ locals: { user } }) => {
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let apiKeyToUse = OPENROUTER_API_KEY;
	let keyType: 'custom' | 'system' = 'system';

	try {
		const userSettings = await convex.query(api.userSettings.getUserSettings, { email: user.email });
		if (userSettings?.openrouterApiKey?.trim()) {
			apiKeyToUse = userSettings.openrouterApiKey.trim();
			keyType = 'custom';
		}
	} catch (err) {
		console.error('Error fetching user settings in /api/openrouter/usage:', err);
	}

	if (!apiKeyToUse) {
		return json({
			hasKey: false,
			keyType,
			message: 'Kein OpenRouter API-Key konfiguriert.'
		});
	}

	try {
		const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${apiKeyToUse}`
			}
		});

		if (!res.ok) {
			const errText = await res.text();
			return json(
				{
					hasKey: true,
					keyType,
					error: `OpenRouter API Fehler (${res.status}): ${errText}`
				},
				{ status: res.status }
			);
		}

		const data: any = await res.json();
		const keyData = data.data || {};

		const limit = keyData.limit !== undefined && keyData.limit !== null ? keyData.limit : null;
		const usage = keyData.usage !== undefined && keyData.usage !== null ? keyData.usage : 0;
		const limitRemaining = limit !== null ? Math.max(0, limit - usage) : null;

		return json({
			hasKey: true,
			keyType,
			label: keyData.label || (keyType === 'custom' ? 'Eigener API-Key' : 'System Key'),
			usage: usage,
			limit: limit,
			limitRemaining: limitRemaining,
			isFreeTier: keyData.is_free_tier ?? false,
			rateLimit: keyData.rate_limit || null
		});
	} catch (err: any) {
		console.error('Error fetching OpenRouter usage:', err);
		return json(
			{
				hasKey: true,
				keyType,
				error: err.message || 'Verbindung zu OpenRouter fehlgeschlagen'
			},
			{ status: 500 }
		);
	}
};

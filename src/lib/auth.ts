import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { Resend } from 'resend';
import { getRequestEvent } from '$app/server';
import {
	RESEND_API_KEY,
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	FACEBOOK_CLIENT_ID,
	FACEBOOK_CLIENT_SECRET
} from '$env/static/private';

export const auth = betterAuth({
	plugins: [sveltekitCookies(() => getRequestEvent())],
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true
	},
	emailVerification: {
		sendOnSignUp: true,
		sendVerificationEmail: async ({ user, url }) => {
			console.log(`[EmailVerification] Attempting to send verification email to: ${user.email}`);
			try {
				const resendClient = new Resend(RESEND_API_KEY);

				const { data, error } = await resendClient.emails.send({
					from: 'Step-Chef <onboarding@resend.dev>',
					to: user.email,
					subject: 'E-Mail bestätigen',
					html: `<a href="${url}">Bitte klicke hier, um deine E-Mail zu bestätigen.</a>`
				});

				if (error) {
					console.error('[EmailVerification] Resend API returned an error:', error);
				} else {
					console.log('[EmailVerification] Resend API success:', data);
				}
			} catch (err) {
				console.error('[EmailVerification] Failed to send verification email:', err);
			}
		}
	},
	socialProviders: {
		google: {
			clientId: GOOGLE_CLIENT_ID!,
			clientSecret: GOOGLE_CLIENT_SECRET!
		},
		facebook: {
			clientId: FACEBOOK_CLIENT_ID!,
			clientSecret: FACEBOOK_CLIENT_SECRET!
		}
	}
});

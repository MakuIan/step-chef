import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { betterAuth } from "better-auth";
import { Resend } from "resend";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { v } from "convex/values";

declare const process: {
	env: Record<string, string | undefined>;
};

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
	return betterAuth({
		database: authComponent.adapter(ctx),
		baseURL: {
			allowedHosts: [
				"localhost:5173",
				"step-chef.vercel.app",
				"*.convex.site",
				"scintillating-goldfinch-133.convex.site",
				...(process.env.SITE_URL ? [process.env.SITE_URL.replace(/^https?:\/\//, '')] : [])
			],
			fallback: process.env.SITE_URL || "http://localhost:5173"
		},
		trustedOrigins: [
			"http://localhost:5173",
			"https://step-chef.vercel.app",
			...(process.env.SITE_URL ? [process.env.SITE_URL] : [])
		],
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true
		},
		emailVerification: {
			sendOnSignUp: true,
			sendVerificationEmail: async ({ user, url }) => {
				try {
					const resendClient = new Resend(process.env.RESEND_API_KEY);
					await resendClient.emails.send({
						from: 'Step-Chef <onboarding@resend.dev>',
						to: user.email,
						subject: 'E-Mail bestätigen',
						html: `<a href="${url}">Bitte klicke hier, um deine E-Mail zu bestätigen.</a>`
					});
				} catch (err) {
					console.error('[EmailVerification] Failed to send verification email:', err);
				}
			}
		},
		socialProviders: {
			...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
				google: {
					clientId: process.env.GOOGLE_CLIENT_ID,
					clientSecret: process.env.GOOGLE_CLIENT_SECRET
				}
			} : {}),
			...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET ? {
				facebook: {
					clientId: process.env.FACEBOOK_CLIENT_ID,
					clientSecret: process.env.FACEBOOK_CLIENT_SECRET
				}
			} : {})
		}
	});
};

// Query to let SvelteKit verify sessions from cookies
export const getSession = query({
	args: {
		sessionToken: v.string()
	},
	handler: async (ctx, args) => {
		const auth = createAuth(ctx);
		return await auth.api.getSession({
			headers: new Headers({
				cookie: `better-auth.session_token=${args.sessionToken}`
			})
		});
	}
});

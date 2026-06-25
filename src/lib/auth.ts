import { betterAuth } from "better-auth";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { Resend } from "resend";
import { getRequestEvent } from "$app/server";

export const auth = betterAuth({
    plugins: [sveltekitCookies(() => getRequestEvent())],
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
    },
    emailVerification: {
        sendOnSignUp: true,
        sendVerificationEmail: async ({ user, url }) => {
            const resendClient = new Resend(process.env.RESEND_API_KEY);
            
            await resendClient.emails.send({
                from: "Step-Chef <onboarding@resend.dev>",
                to: user.email,
                subject: "E-Mail bestätigen",
                html: `<a href="${url}">Bitte klicke hier, um deine E-Mail zu bestätigen.</a>`
            });
        }
    }
});
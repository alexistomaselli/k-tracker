import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createTransport } from "npm:nodemailer@6.9.7";

const SMTP_USER = Deno.env.get("SMTP_USER");
const SMTP_PASS = Deno.env.get("SMTP_PASS");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!SMTP_USER || !SMTP_PASS) {
            throw new Error("SMTP credentials are not set");
        }

        const { to, subject, html, text } = await req.json() as EmailRequest;

        if (!to || !subject || !html) {
            throw new Error("Missing required fields: to, subject, html");
        }

        const transporter = createTransport({
            service: "gmail",
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: `"K-Tracker" <${SMTP_USER}>`,
            to: to,
            subject: subject,
            html: html,
            text: text || html.replace(/<[^>]*>?/gm, ""), // Simple fallback text
        });

        console.log("Email sent:", info.messageId);

        return new Response(JSON.stringify(info), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error: any) {
        console.error("Error sending email:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});

import "server-only";

// Sends the sign-in code through the Resend API.
export async function sendCodeEmail(to: string, code: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "kotes <onboarding@resend.dev>",
      to: [to],
      subject: `${code} is your kotes code`,
      html: html(code),
      text: `Your kotes code: ${code}\n\nIt expires in 10 minutes. If you didn't ask for it, ignore this email.\n\nWe don't have bandwidth to send you promotional emails...`,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}

const display = `'DM Serif Display',Didot,Georgia,serif`;
const serif = `Georgia,'Times New Roman',serif`;

const html = (code: string) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#fbe3e9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbe3e9;padding:40px 16px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#fff6f7;border-radius:24px;">
    <tr><td style="padding:40px 36px 0;font-family:${display};font-style:italic;font-size:28px;color:#2a0711;">
      kotes<span style="color:#e8365f;font-style:normal;">.</span>
    </td></tr>
    <tr><td style="padding:44px 36px 0;font-family:${serif};font-size:20px;line-height:1.45;color:rgba(42,7,17,0.6);">
      Your code to step inside:
    </td></tr>
    <tr><td style="padding:14px 36px 0;font-family:${display};font-size:46px;letter-spacing:12px;color:#e8365f;">
      ${code}
    </td></tr>
    <tr><td style="padding:22px 36px 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:rgba(42,7,17,0.6);">
      It expires in 10 minutes. If you didn&rsquo;t ask for it, ignore this email &mdash; nothing happens without the code.
    </td></tr>
    <tr><td style="padding:40px 36px 40px;">
      <div style="height:1px;background:rgba(42,7,17,0.12);"></div>
      <p style="margin:18px 0 0;font-family:${serif};font-style:italic;font-size:15px;color:rgba(42,7,17,0.6);">
        We don&rsquo;t have bandwidth to send you promotional emails<span style="color:#e8365f;">&hellip;</span>
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;

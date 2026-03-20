import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendRenderedFile(
  email: string,
  renderUrl: string,
  orderNumber: string
) {
  const { data, error } = await resend.emails.send({
    from: "Fotobudka <onboarding@resend.dev>",
    to: email,
    subject: "Your postcard is ready!",
    html: `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px;">
        <h1 style="font-size: 28px; font-weight: 400; color: #3d3929; margin: 0 0 16px;">
          Your postcard is ready!
        </h1>
        <p style="font-size: 16px; color: #8d7e6a; line-height: 1.6; margin: 0 0 24px;">
          Your design has been rendered and is ready to download.
        </p>
        <a href="${renderUrl}"
           style="display: inline-block; padding: 14px 28px; background-color: #da7756; color: #fff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600;">
          Download your postcard
        </a>
        <p style="font-size: 13px; color: #b5a899; margin-top: 32px;">
          Order: ${orderNumber}
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

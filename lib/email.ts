import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Download the rendered file and return it as a Buffer with its content type.
 */
async function downloadFile(url: string): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download render: ${res.status}`);

  const contentType = res.headers.get("content-type") || "application/pdf";
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const isPdf = contentType.includes("pdf");
  const filename = isPdf ? "postcard.pdf" : "postcard.png";

  return { buffer, contentType, filename };
}

export async function sendRenderedFile(
  email: string,
  renderUrl: string,
  orderNumber: string
) {
  // Download the rendered file to attach it
  const file = await downloadFile(renderUrl);
  const isImage = file.contentType.startsWith("image/");

  const { data, error } = await resend.emails.send({
    from: "Fotobudka <onboarding@resend.dev>",
    to: email,
    subject: "Your postcard is ready!",
    attachments: [
      {
        filename: file.filename,
        content: file.buffer,
      },
    ],
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background-color: #eeece2;">
        <!-- Header -->
        <div style="padding: 40px 32px 0; text-align: center;">
          <p style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #a89a85; margin: 0 0 24px;">
            Masterpiece AI
          </p>
          <h1 style="font-size: 32px; font-weight: 400; color: #3d3929; margin: 0 0 8px; line-height: 1.2;">
            Your postcard is ready!
          </h1>
          <p style="font-size: 16px; color: #8d7e6a; line-height: 1.6; margin: 0 0 32px;">
            Your design has been printed and is attached to this email.
          </p>
        </div>

        <!-- Postcard preview -->
        ${isImage ? `
        <div style="padding: 0 32px;">
          <div style="background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
            <img src="${renderUrl}" alt="Your postcard" style="width: 100%; display: block;" />
          </div>
        </div>
        ` : `
        <div style="padding: 0 32px;">
          <div style="background: #fff; border-radius: 16px; padding: 32px; text-align: center; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
            <p style="font-size: 16px; color: #8d7e6a; margin: 0;">
              Your postcard is attached as a PDF file.
            </p>
          </div>
        </div>
        `}

        <!-- Download button -->
        <div style="padding: 28px 32px; text-align: center;">
          <a href="${renderUrl}"
             style="display: inline-block; padding: 14px 36px; background-color: #da7756; color: #fff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600;">
            Download postcard
          </a>
        </div>

        <!-- Divider -->
        <div style="padding: 0 32px;">
          <hr style="border: none; border-top: 1px solid #ddd5c8; margin: 0;" />
        </div>

        <!-- About section — customize content here -->
        <div style="padding: 32px; text-align: center;">
          <p style="font-size: 15px; color: #8d7e6a; line-height: 1.6; margin: 0 0 16px;">
            This postcard was created with Masterpiece AI at FESPA 2026.
          </p>
          <!-- TODO: Add more "about us" content here -->
        </div>

        <!-- Footer -->
        <div style="padding: 0 32px 32px; text-align: center;">
          <p style="font-size: 12px; color: #b5a899; margin: 0;">
            Powered by Printbox
          </p>
        </div>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

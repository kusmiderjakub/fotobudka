import { Resend } from "resend";
import { downloadProjectRender } from "./printbox";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

let _cachedFromAddress: string | null = null;

/**
 * Get the FROM address. Tries in order:
 * 1. EMAIL_FROM env var (if set)
 * 2. Auto-detect from first verified domain in Resend account
 * 3. Default fallback
 */
async function getFromAddress(): Promise<string> {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  if (_cachedFromAddress) return _cachedFromAddress;

  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    if (res.ok) {
      const body = await res.json();
      const verified = body.data?.find(
        (d: { status: string; name: string }) => d.status === "verified"
      );
      if (verified) {
        _cachedFromAddress = `Masterpiece AI <noreply@${verified.name}>`;
        console.log("[email] Auto-detected FROM address:", _cachedFromAddress);
        return _cachedFromAddress;
      }
    }
  } catch (err) {
    console.warn("[email] Failed to auto-detect domain:", err);
  }

  return "Fotobudka <onboarding@resend.dev>";
}

/**
 * Download the render for a project and send it via email.
 * Uses the same download path as the render-image API endpoint.
 */
export async function sendRenderedFile(
  email: string,
  projectUuid: string,
  orderNumber: string
) {
  const file = await downloadProjectRender(projectUuid);
  if (!file) {
    throw new Error(`Render not ready for project ${projectUuid}`);
  }

  const isImage = file.contentType.startsWith("image/");

  console.log(
    "[email] Sending to:",
    email,
    "file:",
    file.filename,
    "type:",
    file.contentType,
    "size:",
    file.buffer.length
  );

  const fromAddress = await getFromAddress();
  console.log("[email] Using FROM:", fromAddress);

  const { data, error } = await getResend().emails.send({
    from: fromAddress,
    to: email,
    subject: "Your postcard is ready!",
    attachments: [
      {
        filename: file.filename,
        content: file.buffer.toString("base64"),
        contentId: "postcard",
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

        <!-- Postcard preview (only for images) -->
        ${isImage ? `
        <div style="padding: 0 32px;">
          <div style="background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
            <img src="cid:postcard" alt="Your postcard" style="width: 100%; display: block;" />
          </div>
        </div>
        ` : `
        <div style="padding: 0 32px;">
          <div style="background: #fff; border-radius: 16px; padding: 32px; text-align: center; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
            <p style="font-size: 16px; color: #8d7e6a; margin: 0;">
              Your postcard is attached to this email.
            </p>
          </div>
        </div>
        `}

        <!-- Divider -->
        <div style="padding: 32px 32px 0;">
          <hr style="border: none; border-top: 1px solid #ddd5c8; margin: 0;" />
        </div>

        <!-- About section -->
        <div style="padding: 32px; text-align: center;">
          <p style="font-size: 15px; color: #8d7e6a; line-height: 1.6; margin: 0 0 16px;">
            This postcard was created with Masterpiece AI at FESPA 2026.
          </p>
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

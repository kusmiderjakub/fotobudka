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

function getAppBaseUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL)
    return `https://${process.env.VERCEL_URL}`;
  return "https://fotobudka.vercel.app";
}

const EMAIL_SUBJECT = "You've got mail! Your postcard has just arrived.";

function buildEmailHtml(isImage: boolean, projectUuid: string): string {
  const shareUrl = `${getAppBaseUrl()}/share/${projectUuid}`;

  const postcardSection = isImage
    ? `<div style="padding: 0 40px;">
          <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
            <img src="cid:postcard" alt="Your postcard" style="width: 100%; display: block;" />
          </div>
        </div>`
    : `<div style="padding: 0 40px;">
          <div style="background: #ffffff; border-radius: 12px; padding: 32px; text-align: center; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
            <p style="font-family: 'Lato', Arial, Helvetica, sans-serif; font-size: 14px; color: #333333; margin: 0;">
              Your postcard is attached to this email.
            </p>
          </div>
        </div>`;

  return `
    <div style="font-family: 'Lato', Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <!-- Header logo -->
      <div style="padding: 40px 40px 0; text-align: center;">
        <img src="https://cdn.prod.website-files.com/68357ad7b05d1d4ba4d8a89f/68357ad7b05d1d4ba4d8a93f_masterpiece_logo_transparent.png" alt="Masterpiece AI by Printbox" style="height: 40px; margin: 0 0 32px;" />
      </div>

      <!-- Headline -->
      <div style="padding: 0 40px; text-align: center;">
        <h1 style="font-family: 'Lato', Arial, Helvetica, sans-serif; font-size: 28px; font-weight: 700; color: #2f2663; margin: 0 0 12px; line-height: 1.3;">
          The postman just delivered something special for you!
        </h1>
        <p style="font-family: 'Lato', Arial, Helvetica, sans-serif; font-size: 14px; color: #333333; line-height: 1.6; margin: 0 0 32px;">
          Your postcard is sealed, stamped and delivered &mdash; straight to your inbox.
        </p>
      </div>

      <!-- Postcard preview -->
      ${postcardSection}

      <!-- Caption -->
      <div style="padding: 16px 40px 0; text-align: center;">
        <p style="font-family: 'Lato', Arial, Helvetica, sans-serif; font-size: 12px; font-style: italic; color: #666666; margin: 0;">
          Stamped and created with Masterpiece AI at FESPA 2026, Barcelona.
        </p>
      </div>

      <!-- Divider -->
      <div style="padding: 32px 40px;">
        <hr style="border: none; border-top: 1px solid #fe9528; margin: 0;" />
      </div>

      <!-- Share section -->
      <div style="padding: 0 40px; text-align: center;">
        <h2 style="font-family: 'Lato', Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 700; color: #2f2663; margin: 0 0 8px;">
          Liked your postcard? Send it to the world!
        </h2>
        <p style="font-family: 'Lato', Arial, Helvetica, sans-serif; font-size: 14px; color: #333333; line-height: 1.6; margin: 0 0 24px;">
          Share your creation on your social media and show your friends what arrived in your inbox today.
        </p>
        <p style="font-family: 'Lato', Arial, Helvetica, sans-serif; font-size: 14px; color: #333333; line-height: 1.6; margin: 0 0 16px;">
          You can freely use this caption with personalised hashtag <strong style="color: #fe9528;">#StampedWithMasterpieceAI</strong>
        </p>
      </div>

      <!-- Quote Box -->
      <div style="padding: 0 40px; margin-bottom: 16px;">
        <div style="background-color: #e8e5f5; border-radius: 12px; padding: 20px 24px;">
          <p style="font-family: 'Lato', Arial, Helvetica, sans-serif; font-size: 14px; font-style: italic; color: #2f2663; line-height: 1.6; margin: 0;">
            Just got my postcard from FESPA 2026 in Barcelona. Stamped with Masterpiece AI by <strong>@Printbox</strong> \u{1f1ea}\u{1f1f8}\u{2709}\u{fe0f}!
          </p>
        </div>
      </div>

      <!-- Hashtags -->
      <div style="padding: 0 40px 24px; text-align: center;">
        <p style="font-family: 'Lato', Arial, Helvetica, sans-serif; font-size: 12px; font-weight: 700; color: #fe9528; margin: 0;">
          #StampedWithMasterpieceAI &nbsp; #PostcardFromFESPA &nbsp; #FESPA2026
        </p>
      </div>

      <!-- Share button — links to the share page where Web Share API can attach the image -->
      <div style="padding: 0 40px 32px; text-align: center;">
        <a href="${shareUrl}" target="_blank" style="display: inline-block; background-color: #fe9528; color: #ffffff; font-family: 'Lato', Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 8px; padding: 12px 48px;">
          Share your postcard
        </a>
      </div>

      <!-- Footer -->
      <div style="padding: 0 40px 40px; text-align: center;">
        <p style="font-family: 'Lato', Arial, Helvetica, sans-serif; font-size: 12px; font-style: italic; color: #666666; margin: 0;">
          Powered by Masterpiece AI &amp; Printbox
        </p>
      </div>
    </div>
  `;
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
    subject: EMAIL_SUBJECT,
    attachments: [
      {
        filename: file.filename,
        content: file.buffer.toString("base64"),
        contentId: "postcard",
      },
    ],
    html: buildEmailHtml(isImage, projectUuid),
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

/**
 * Send email with an already-downloaded image buffer.
 * Used by the webhook handler which fetches from our own render-image endpoint.
 */
export async function sendRenderedFileWithBuffer(
  email: string,
  imageBuffer: Buffer,
  contentType: string,
  orderNumber: string,
  projectUuid?: string
) {
  const isImage = contentType.startsWith("image/");
  const filename = contentType.includes("png") ? "postcard.png" : "postcard.jpg";

  console.log("[email] Sending to:", email, "type:", contentType, "size:", imageBuffer.length);

  const fromAddress = await getFromAddress();
  console.log("[email] Using FROM:", fromAddress);

  const { data, error } = await getResend().emails.send({
    from: fromAddress,
    to: email,
    subject: EMAIL_SUBJECT,
    attachments: [
      {
        filename,
        content: imageBuffer.toString("base64"),
        contentId: "postcard",
      },
    ],
    html: buildEmailHtml(isImage, projectUuid || orderNumber),
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

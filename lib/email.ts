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

      <!-- Social media buttons — each links to share page with platform param for proper image sharing -->
      <div style="padding: 0 40px 32px; text-align: center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
          <tr>
            <td style="padding: 0 6px 0 0;">
              <a href="${shareUrl}?platform=linkedin" target="_blank" style="display: inline-block; width: 48px; height: 48px; background-color: #0A66C2; border-radius: 8px; text-align: center; line-height: 48px; text-decoration: none;">
                <!--[if mso]><img src="https://img.icons8.com/ios-filled/24/ffffff/linkedin.png" width="24" height="24" style="vertical-align:middle;" /><![endif]-->
                <!--[if !mso]><!-->
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#ffffff" style="vertical-align:middle;"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                <!--<![endif]-->
              </a>
            </td>
            <td style="padding: 0 6px;">
              <a href="${shareUrl}?platform=facebook" target="_blank" style="display: inline-block; width: 48px; height: 48px; background-color: #1877F2; border-radius: 8px; text-align: center; line-height: 48px; text-decoration: none;">
                <!--[if mso]><img src="https://img.icons8.com/ios-filled/24/ffffff/facebook-new.png" width="24" height="24" style="vertical-align:middle;" /><![endif]-->
                <!--[if !mso]><!-->
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#ffffff" style="vertical-align:middle;"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                <!--<![endif]-->
              </a>
            </td>
            <td style="padding: 0 6px;">
              <a href="${shareUrl}?platform=instagram" target="_blank" style="display: inline-block; width: 48px; height: 48px; background-color: #E4405F; border-radius: 8px; text-align: center; line-height: 48px; text-decoration: none;">
                <!--[if mso]><img src="https://img.icons8.com/ios-filled/24/ffffff/instagram-new.png" width="24" height="24" style="vertical-align:middle;" /><![endif]-->
                <!--[if !mso]><!-->
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#ffffff" style="vertical-align:middle;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                <!--<![endif]-->
              </a>
            </td>
            <td style="padding: 0 0 0 6px;">
              <a href="${shareUrl}?platform=tiktok" target="_blank" style="display: inline-block; width: 48px; height: 48px; background-color: #000000; border-radius: 8px; text-align: center; line-height: 48px; text-decoration: none;">
                <!--[if mso]><img src="https://img.icons8.com/ios-filled/24/ffffff/tiktok.png" width="24" height="24" style="vertical-align:middle;" /><![endif]-->
                <!--[if !mso]><!-->
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 448 512" fill="#ffffff" style="vertical-align:middle;"><path d="M448 209.9a210.1 210.1 0 01-122.8-39.3v178.8A162.6 162.6 0 11185 188.3v89.9a74.6 74.6 0 1052.2 71.2V0h88a121 121 0 00122.8 121.1z"/></svg>
                <!--<![endif]-->
              </a>
            </td>
          </tr>
        </table>
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

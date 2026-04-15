import { Resend } from "resend";

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
 * Minimal tar parser — extracts the first file from a tar archive.
 */
function extractFirstFileFromTar(buffer: Buffer): {
  filename: string;
  data: Buffer;
} | null {
  let offset = 0;

  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;

    const filenameEnd = header.indexOf(0);
    const filename = header
      .subarray(0, filenameEnd > 0 && filenameEnd < 100 ? filenameEnd : 100)
      .toString("utf-8")
      .trim();

    const sizeStr = header.subarray(124, 136).toString("utf-8").trim();
    const size = parseInt(sizeStr, 8) || 0;

    const typeFlag = header[156];
    const isFile = typeFlag === 0 || typeFlag === 48;

    offset += 512;

    if (isFile && size > 0) {
      const data = buffer.subarray(offset, offset + size);
      return { filename, data };
    }

    offset += Math.ceil(size / 512) * 512;
  }

  return null;
}

/**
 * Download the rendered file. If it's a tar archive, extract the first file.
 */
async function downloadRender(url: string): Promise<{
  buffer: Buffer;
  contentType: string;
  filename: string;
}> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download render: ${res.status}`);

  const contentType = res.headers.get("content-type") || "";
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // If it's a tar archive, extract the first file
  if (
    url.endsWith(".tar") ||
    contentType.includes("tar") ||
    contentType.includes("octet-stream")
  ) {
    const file = extractFirstFileFromTar(buffer);
    if (file) {
      const lower = file.filename.toLowerCase();
      let extractedType = "application/octet-stream";
      if (lower.endsWith(".png")) extractedType = "image/png";
      else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg"))
        extractedType = "image/jpeg";
      else if (lower.endsWith(".pdf")) extractedType = "application/pdf";

      return {
        buffer: Buffer.from(file.data),
        contentType: extractedType,
        filename: file.filename,
      };
    }
  }

  // Not a tar — return as-is
  const isPdf = contentType.includes("pdf");
  const filename = isPdf ? "postcard.pdf" : "postcard.png";

  return { buffer, contentType, filename };
}

export async function sendRenderedFile(
  email: string,
  renderUrl: string,
  orderNumber: string
) {
  // Download and extract the rendered file
  const file = await downloadRender(renderUrl);
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

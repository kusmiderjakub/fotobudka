import { NextRequest, NextResponse } from "next/server";
import { sendRenderedFileWithBuffer } from "@/lib/email";
import {
  isConfigured as isMailchimpConfigured,
  removeOrderTag,
} from "@/lib/mailchimp";

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// Printbox webhook callback for order events
export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    console.log("[webhook] Raw payload:", raw.slice(0, 500));

    const payload = JSON.parse(raw);
    const status = payload?.data?.status;
    const orderNumber = payload?.data?.number;

    console.log("[webhook] Status:", status, "Order:", orderNumber);

    if (payload.model !== "Order" || payload.event !== "updated" || status !== "Rendered" || !orderNumber) {
      return NextResponse.json({ ok: true });
    }

    // Step 1: Get project UUID from payload
    const projectUuid = payload.data?.projects?.[0]?.uuid;
    console.log("[webhook] Step 1 - Project UUID:", projectUuid);

    if (!projectUuid) {
      console.log("[webhook] No project UUID in payload");
      return NextResponse.json({ ok: true });
    }

    // Step 2: Get email from payload reference
    const email = payload.data?.reference;
    console.log("[webhook] Step 2 - Email from reference:", email);

    if (!email || !looksLikeEmail(email)) {
      console.warn("[webhook] No valid email in reference:", email);
      return NextResponse.json({ ok: true });
    }

    // Step 3: Fetch render image from our own API
    const origin = request.nextUrl.origin;
    const renderApiUrl = `${origin}/api/projects/${projectUuid}/render-image`;
    console.log("[webhook] Step 3 - Fetching:", renderApiUrl);

    let imageBuffer: Buffer | null = null;
    let contentType = "image/png";

    for (let attempt = 1; attempt <= 6; attempt++) {
      if (attempt > 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
      try {
        const res = await fetch(renderApiUrl, { cache: "no-store" });
        const ct = res.headers.get("content-type") || "";
        console.log(`[webhook] Attempt ${attempt}: status=${res.status} ct=${ct}`);

        if (res.ok && ct.startsWith("image/")) {
          imageBuffer = Buffer.from(await res.arrayBuffer());
          contentType = ct;
          console.log("[webhook] Got image:", imageBuffer.length, "bytes");
          break;
        }
        if (res.status === 202) {
          continue; // not ready yet
        }
        // other error — log body and continue retrying
        const body = await res.text().catch(() => "");
        console.warn(`[webhook] Attempt ${attempt} error body:`, body.slice(0, 200));
      } catch (fetchErr) {
        console.error(`[webhook] Attempt ${attempt} fetch error:`, fetchErr);
      }
    }

    if (!imageBuffer) {
      console.error("[webhook] All render fetch attempts failed");
      return NextResponse.json({ error: "Render not available" }, { status: 500 });
    }

    // Step 4: Send email
    console.log("[webhook] Step 4 - Sending email to:", email);
    await sendRenderedFileWithBuffer(email, imageBuffer, contentType, orderNumber);
    console.log("[webhook] Email sent successfully!");

    // Step 5: Clean up Mailchimp
    if (isMailchimpConfigured()) {
      try {
        await removeOrderTag(email, orderNumber);
      } catch (err) {
        console.warn("[webhook] Mailchimp cleanup error:", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[webhook] FATAL:", String(error));
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}

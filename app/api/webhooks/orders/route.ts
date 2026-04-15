import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/printbox";
import { sendRenderedFileWithBuffer } from "@/lib/email";
import {
  isConfigured as isMailchimpConfigured,
  getEmailByOrderNumber,
  removeOrderTag,
} from "@/lib/mailchimp";

interface WebhookProject {
  uuid: string;
  quantity: number;
}

interface WebhookPayload {
  hook_id: number;
  model: string;
  event: string;
  data: {
    number: string;
    status: string;
    reference: string;
    projects: WebhookProject[];
    [key: string]: unknown;
  };
}

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// Printbox webhook callback for order events
export async function POST(request: NextRequest) {
  try {
    const payload: WebhookPayload = await request.json();
    console.log("[webhook] Received:", payload.model, payload.event, payload.data?.status, payload.data?.number);

    if (payload.model === "Order" && payload.event === "updated") {
      const orderNumber = payload.data?.number;
      const status = payload.data?.status;

      if (status === "Rendered" && orderNumber) {
        // Get project UUID directly from webhook payload
        const projectUuid = payload.data.projects?.[0]?.uuid;
        if (!projectUuid) {
          console.log("[webhook] No project UUID in payload for order:", orderNumber);
          return NextResponse.json({ ok: true });
        }
        console.log("[webhook] Project:", projectUuid);

        // Get email from payload reference, API, or Mailchimp
        let email: string | null = null;
        const reference = payload.data.reference;
        if (reference && looksLikeEmail(reference)) {
          email = reference;
        }
        if (!email) {
          try {
            const order = await getOrder(orderNumber);
            if (order.reference && looksLikeEmail(order.reference)) {
              email = order.reference;
            }
          } catch (err) {
            console.warn("[webhook] Failed to fetch order:", err);
          }
        }
        if (!email && isMailchimpConfigured()) {
          email = await getEmailByOrderNumber(orderNumber);
        }
        if (!email) {
          console.warn("[webhook] No email found for order:", orderNumber);
          return NextResponse.json({ ok: true });
        }
        console.log("[webhook] Email:", email);

        // Fetch rendered image from our own API endpoint (proven to work)
        const origin = new URL(request.url).origin;
        const renderUrl = `${origin}/api/projects/${projectUuid}/render-image`;
        console.log("[webhook] Fetching render from own API:", renderUrl);

        let imageBuffer: Buffer | null = null;
        let contentType = "image/png";

        for (let attempt = 0; attempt < 8; attempt++) {
          if (attempt > 0) {
            await new Promise((r) => setTimeout(r, 3000));
          }
          console.log(`[webhook] Render fetch attempt ${attempt + 1}`);
          const res = await fetch(renderUrl, { cache: "no-store" });
          const ct = res.headers.get("content-type") || "";

          if (res.ok && ct.startsWith("image/")) {
            imageBuffer = Buffer.from(await res.arrayBuffer());
            contentType = ct;
            console.log("[webhook] Got image, size:", imageBuffer.length);
            break;
          }
          if (res.status === 202) {
            console.log("[webhook] Render not ready yet, retrying...");
            continue;
          }
          console.warn("[webhook] Render fetch failed:", res.status, ct);
        }

        if (!imageBuffer) {
          console.error("[webhook] Failed to get render image after retries");
          return NextResponse.json({ error: "Render not available" }, { status: 500 });
        }

        // Send email with the image
        await sendRenderedFileWithBuffer(email, imageBuffer, contentType, orderNumber);
        console.log("[webhook] Email sent to:", email, "for order:", orderNumber);

        // Clean up Mailchimp tag if configured
        if (isMailchimpConfigured()) {
          try {
            await removeOrderTag(email, orderNumber);
          } catch (err) {
            console.warn("[webhook] Failed to remove Mailchimp tag:", err);
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[webhook] Error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}

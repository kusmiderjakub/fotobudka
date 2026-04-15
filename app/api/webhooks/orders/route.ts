import { NextRequest, NextResponse } from "next/server";
import { sendRenderedFile } from "@/lib/email";
import { getOrder } from "@/lib/printbox";
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
        // Get project UUID directly from webhook payload (no API call needed)
        const projectUuid = payload.data.projects?.[0]?.uuid;
        if (!projectUuid) {
          console.log("[webhook] No project UUID in webhook payload for order:", orderNumber);
          return NextResponse.json({ ok: true });
        }

        console.log("[webhook] Project UUID from payload:", projectUuid);

        // Get email: first try order reference (from payload), then fetch order, then Mailchimp
        let email: string | null = null;

        // The reference field is in the webhook payload itself
        const reference = payload.data.reference;
        if (reference && looksLikeEmail(reference)) {
          email = reference;
          console.log("[webhook] Got email from payload reference:", email);
        }

        // Fallback: fetch order from API
        if (!email) {
          try {
            const order = await getOrder(orderNumber);
            if (order.reference && looksLikeEmail(order.reference)) {
              email = order.reference;
              console.log("[webhook] Got email from order API:", email);
            }
          } catch (err) {
            console.warn("[webhook] Failed to fetch order:", err);
          }
        }

        // Fallback: Mailchimp
        if (!email && isMailchimpConfigured()) {
          email = await getEmailByOrderNumber(orderNumber);
          if (email) {
            console.log("[webhook] Got email from Mailchimp:", email);
          }
        }

        if (!email) {
          console.warn("[webhook] No email found for order:", orderNumber);
          return NextResponse.json({ ok: true });
        }

        // Send email with rendered file
        await sendRenderedFile(email, projectUuid, orderNumber);
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

import { NextRequest, NextResponse } from "next/server";
import { sendRenderedFile } from "@/lib/email";
import {
  isConfigured as isMailchimpConfigured,
  getEmailByOrderNumber,
  removeOrderTag,
} from "@/lib/mailchimp";

interface PrintingOrder {
  render_status: "SUCCESS" | "NEW" | "FAILURE";
  render_url: string | null;
  render_time: string | null;
}

interface WebhookPayload {
  hook_id: number;
  model: string;
  event: string;
  data: {
    number: string;
    status: string;
    printing_orders?: PrintingOrder[];
    [key: string]: unknown;
  };
}

// Printbox webhook callback for order events
export async function POST(request: NextRequest) {
  try {
    const payload: WebhookPayload = await request.json();
    console.log("[webhook] Received:", payload.model, payload.event, payload.data?.number);

    if (payload.model === "Order" && payload.event === "updated") {
      const orderNumber = payload.data?.number;
      const status = payload.data?.status;

      if (status === "Rendered" && orderNumber) {
        // Find a successfully rendered file URL
        const renderUrl = payload.data.printing_orders
          ?.find((po) => po.render_status === "SUCCESS")
          ?.render_url;

        if (!renderUrl) {
          console.log("[webhook] No successful render URL found for order:", orderNumber);
          return NextResponse.json({ ok: true });
        }

        // Look up email from Mailchimp
        if (!isMailchimpConfigured()) {
          console.warn("[webhook] Mailchimp not configured, cannot look up email for order:", orderNumber);
          return NextResponse.json({ ok: true });
        }

        const email = await getEmailByOrderNumber(orderNumber);

        if (!email) {
          console.log("[webhook] No email found in Mailchimp for order:", orderNumber);
          return NextResponse.json({ ok: true });
        }

        // Send email with rendered file
        await sendRenderedFile(email, renderUrl, orderNumber);
        console.log("[webhook] Email sent to:", email, "for order:", orderNumber);

        // Remove the order-specific tag (keep subscriber in audience)
        await removeOrderTag(email, orderNumber);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[webhook] Error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}

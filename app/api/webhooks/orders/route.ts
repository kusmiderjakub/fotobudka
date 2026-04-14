import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { sendRenderedFile } from "@/lib/email";

function getRedis(): Redis | null {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return null;
    }
    return Redis.fromEnv();
  } catch {
    return null;
  }
}

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

        // Look up email from Redis
        const redis = getRedis();
        if (!redis) {
          console.warn("[webhook] Redis not configured, cannot look up email for order:", orderNumber);
          return NextResponse.json({ ok: true });
        }

        const entry = await redis.get<{ email: string; projectId: string }>(
          `order:${orderNumber}`
        );

        if (!entry?.email) {
          console.log("[webhook] No email found in Redis for order:", orderNumber);
          return NextResponse.json({ ok: true });
        }

        // Send email with rendered file
        await sendRenderedFile(entry.email, renderUrl, orderNumber);
        console.log("[webhook] Email sent to:", entry.email, "for order:", orderNumber);

        // Clean up Redis entry
        await redis.del(`order:${orderNumber}`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[webhook] Error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}

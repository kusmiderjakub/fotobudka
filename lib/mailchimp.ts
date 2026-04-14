import { createHash } from "crypto";

const API_KEY = process.env.MAILCHIMP_API_KEY || "";
const LIST_ID = process.env.MAILCHIMP_LIST_ID || "";
const SERVER = API_KEY.split("-").pop(); // e.g. "us1"

function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

async function mailchimpFetch<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(
    `https://${SERVER}.api.mailchimp.com/3.0${path}`,
    {
      ...options,
      headers: {
        Authorization: `apikey ${API_KEY}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mailchimp API error ${res.status}: ${text}`);
  }

  // Some endpoints (e.g. tags) return 204 No Content with empty body
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export function isConfigured(): boolean {
  return !!(API_KEY && LIST_ID && SERVER);
}

/**
 * Add or update a subscriber in the audience and tag them with the order number.
 * Uses PUT (upsert) so re-orders from the same email just update the record.
 */
export async function addSubscriberWithOrder(
  email: string,
  orderNumber: string,
  projectId: string
): Promise<void> {
  const hash = md5(email.toLowerCase().trim());

  // Upsert subscriber
  await mailchimpFetch(`/lists/${LIST_ID}/members/${hash}`, {
    method: "PUT",
    body: JSON.stringify({
      email_address: email,
      status_if_new: "subscribed",
      merge_fields: {
        ORDER_NO: orderNumber,
        PROJECT: projectId,
      },
    }),
  });

  // Tag with "fotobudka" + order-specific tag for webhook lookup
  await mailchimpFetch(`/lists/${LIST_ID}/members/${hash}/tags`, {
    method: "POST",
    body: JSON.stringify({
      tags: [
        { name: "fespa 2026", status: "active" },
        { name: `order:${orderNumber}`, status: "active" },
      ],
    }),
  });
}

/**
 * Find a subscriber's email by their order tag.
 * Searches segments (tags are static segments in Mailchimp) for one
 * matching "order:{orderNumber}", then returns the first member's email.
 */
export async function getEmailByOrderNumber(
  orderNumber: string
): Promise<string | null> {
  const tagName = `order:${orderNumber}`;

  // List all static segments (tags) to find the matching one
  const segments = await mailchimpFetch<{
    segments: { id: number; name: string }[];
  }>(`/lists/${LIST_ID}/segments?type=static&count=1000`);

  const segment = segments.segments.find((s) => s.name === tagName);
  if (!segment) return null;

  // Get members of this segment
  const members = await mailchimpFetch<{
    members: { email_address: string }[];
  }>(`/lists/${LIST_ID}/segments/${segment.id}/members?count=1`);

  return members.members[0]?.email_address || null;
}

/**
 * Remove the order-specific tag after the email has been sent.
 * Keeps the "fotobudka" tag so the subscriber stays in the audience.
 */
export async function removeOrderTag(
  email: string,
  orderNumber: string
): Promise<void> {
  const hash = md5(email.toLowerCase().trim());

  await mailchimpFetch(`/lists/${LIST_ID}/members/${hash}/tags`, {
    method: "POST",
    body: JSON.stringify({
      tags: [{ name: `order:${orderNumber}`, status: "inactive" }],
    }),
  });
}

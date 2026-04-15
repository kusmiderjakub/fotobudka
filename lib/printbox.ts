import {
  PaginatedResponse,
  ProductFamily,
  EditorModule,
  CustomerSession,
  Order,
  Product,
  ProductImage,
  Customer,
} from "./types";

const BASE_URL = process.env.PRINTBOX_BASE_URL!;
const CLIENT_ID = process.env.PRINTBOX_CLIENT_ID!;
const CLIENT_SECRET = process.env.PRINTBOX_CLIENT_SECRET!;

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const res = await fetch(`${BASE_URL}/o/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(
      `Printbox API error ${res.status}: ${await res.text()}`
    );
  }

  return res.json();
}

// Raw fetch — returns untyped JSON for debugging
export async function apiFetchRaw(path: string): Promise<unknown> {
  return apiFetch<unknown>(path);
}

export async function getProductFamilies(): Promise<ProductFamily[]> {
  const data = await apiFetch<PaginatedResponse<ProductFamily>>(
    "/api/ec/v4/product-families/"
  );
  return data.results;
}

export async function getProducts(familyId: number): Promise<Product[]> {
  const data = await apiFetch<PaginatedResponse<Product>>(
    `/api/ec/v4/products/?family_id=${familyId}`
  );
  return data.results;
}

export async function getProduct(productId: number): Promise<Product> {
  return apiFetch<Product>(`/api/ec/v4/products/${productId}/`);
}

export async function getProductImages(
  productId: number
): Promise<ProductImage[]> {
  const data = await apiFetch<PaginatedResponse<ProductImage>>(
    `/api/ec/v4/products/${productId}/images/`
  );
  return data.results;
}

export async function getEditorModules(
  familyId?: number
): Promise<EditorModule[]> {
  const params = familyId ? `?family_id=${familyId}` : "";
  const data = await apiFetch<PaginatedResponse<EditorModule>>(
    `/api/ec/v4/editor-modules/${params}`
  );
  return data.results;
}

export async function createCustomer(email: string): Promise<Customer> {
  return apiFetch<Customer>("/api/ec/v4/customers/", {
    method: "POST",
    body: JSON.stringify({ email, username: email }),
  });
}

export async function createSession(
  customerId: number
): Promise<CustomerSession> {
  return apiFetch<CustomerSession>("/api/ec/v4/sessions/", {
    method: "POST",
    body: JSON.stringify({ customer_id: customerId }),
  });
}


export async function getProjectCustomerId(projectUuid: string): Promise<number> {
  const data = await apiFetch<{ customer_id: number }>(
    `/api/ec/v4/projects/${projectUuid}/`
  );
  return data.customer_id;
}

export async function createOrder(params: {
  customer_id: number;
  number: string;
  reference: string;
  currency: string;
  projects: { uuid: string; quantity: number }[];
}): Promise<Order> {
  return apiFetch<Order>("/api/ec/v4/orders/", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function markOrderPaid(orderNumber: string): Promise<Order> {
  return apiFetch<Order>(`/api/ec/v4/orders/${orderNumber}/`, {
    method: "PATCH",
    body: JSON.stringify({ status: "Paid" }),
  });
}

export interface PrintboxProject {
  uuid: string;
  customer_id: number;
  thumbnail_url: string;
  name: string;
  status: string;
  render_status: string | null;
  render_url: string | null;
  order_status: string | null;
  [key: string]: unknown;
}

export async function getProject(projectUuid: string): Promise<PrintboxProject> {
  return apiFetch<PrintboxProject>(`/api/ec/v4/projects/${projectUuid}/`);
}

export async function getOrderProjects(orderNumber: string): Promise<PrintboxProject[]> {
  const data = await apiFetch<PaginatedResponse<PrintboxProject>>(
    `/api/ec/v4/projects/?order_number=${orderNumber}`
  );
  return data.results;
}

export async function getOrder(orderNumber: string): Promise<Order> {
  return apiFetch<Order>(`/api/ec/v4/orders/${orderNumber}/`);
}

/**
 * Tar parser — extracts the first image/PDF file, skipping .md5 checksums.
 */
function extractImageFromTar(buffer: Buffer): {
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
      const lower = filename.toLowerCase();
      const isContent =
        lower.endsWith(".png") ||
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".pdf") ||
        lower.endsWith(".tiff") ||
        lower.endsWith(".tif");
      if (isContent) {
        return { filename, data: buffer.subarray(offset, offset + size) };
      }
    }

    offset += Math.ceil(size / 512) * 512;
  }
  return null;
}

export interface RenderResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

/**
 * Download and extract the rendered image for a project.
 * Uses getProject() to get a fresh render_url, then downloads from CDN with retry.
 * Returns null if the render is not ready yet.
 */
export async function downloadProjectRender(
  projectUuid: string
): Promise<RenderResult | null> {
  const project = await getProject(projectUuid);
  console.log("[printbox] downloadProjectRender", projectUuid, "render_status:", project.render_status);

  if (project.render_status !== "SUCCESS" || !project.render_url) {
    return null;
  }

  // Retry download — CDN may 404 briefly after render completes
  let tarRes: Response | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) {
      console.log(`[printbox] Render download retry ${attempt}/4, waiting 3s...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
    tarRes = await fetch(project.render_url, { cache: "no-store" });
    if (tarRes.ok) break;
    console.warn(`[printbox] Render download attempt ${attempt + 1} failed:`, tarRes.status);
  }

  if (!tarRes || !tarRes.ok) {
    throw new Error(`Failed to download render: ${tarRes?.status}`);
  }

  const tarBuffer = Buffer.from(await tarRes.arrayBuffer());
  const file = extractImageFromTar(tarBuffer);

  if (!file) {
    throw new Error("No image file found in render archive");
  }

  console.log("[printbox] Extracted:", file.filename, "size:", file.data.length);

  const lower = file.filename.toLowerCase();
  let contentType = "application/octet-stream";
  if (lower.endsWith(".png")) contentType = "image/png";
  else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) contentType = "image/jpeg";
  else if (lower.endsWith(".pdf")) contentType = "application/pdf";

  return {
    buffer: Buffer.from(file.data),
    contentType,
    filename: file.filename,
  };
}

export async function getOrders(params?: {
  customer_id?: number;
  number?: string;
}): Promise<Order[]> {
  const searchParams = new URLSearchParams();
  if (params?.customer_id)
    searchParams.set("customer_id", String(params.customer_id));
  if (params?.number) searchParams.set("number", params.number);
  const query = searchParams.toString();
  const data = await apiFetch<PaginatedResponse<Order>>(
    `/api/ec/v4/orders/${query ? `?${query}` : ""}`
  );
  return data.results;
}

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

export async function getProductFamilies(): Promise<ProductFamily[]> {
  const data = await apiFetch<PaginatedResponse<ProductFamily>>(
    "/api/ec/v4/product-families/"
  );
  return data.results;
}

export async function getProducts(familyId: number, storeName?: string): Promise<Product[]> {
  const params = new URLSearchParams({ family_id: String(familyId) });
  if (storeName) params.set("store_name", storeName);
  const data = await apiFetch<PaginatedResponse<Product>>(
    `/api/ec/v4/products/?${params}`
  );
  return data.results;
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
}

export async function getProject(projectUuid: string): Promise<PrintboxProject> {
  return apiFetch<PrintboxProject>(`/api/ec/v4/projects/${projectUuid}/`);
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

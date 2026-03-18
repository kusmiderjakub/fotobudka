export interface ProductFamily {
  id: number;
  name: string;
  display_name: Record<string, string>;
  estimated_weight: number | null;
  production_duration: number;
  quantity_editable_in_cart: boolean;
}

export interface Product {
  id: number;
  name: string;
  display_name: Record<string, string>;
  position: number;
  family_id: number;
  friendly_url: Record<string, string>;
  attribute_value_ids: number[];
  store_ids: number[];
  category_ids: number[];
}

export interface ProductImage {
  id: number;
  image: string;
  position: number;
}

export interface EditorModule {
  id: number;
  name: string;
  display_name: Record<string, string>;
  friendly_url: Record<string, string>;
  family_id: number | null;
  is_default: boolean;
  is_enabled: boolean;
  is_journey: boolean;
}

export interface CustomerSession {
  customer_id: number;
  session_key: string;
  expiry_date: string;
}

export interface Customer {
  id: number;
  username: string;
  email: string;
}

export interface Order {
  number: string;
  reference: string;
  status: string;
  customer_id: number | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ProductWithImage extends Product {
  image: string | null;
  editorModuleId: number | null;
}

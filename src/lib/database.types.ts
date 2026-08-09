/**
 * Shared database types.
 *
 * Copied into each app as `src/lib/database.types.ts` so both stay in sync.
 * Regenerate with:
 *   npx supabase gen types typescript --project-id <ref> > supabase/types.ts
 */

export type OrderStatus = "pending" | "confirmed" | "cancelled";

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  group_name: string;
  tint: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category_id: string | null;
  description: string;
  rating: number;
  stock: number;
  unit: string;
  image_url: string | null;
  images: string[];
  tags: string[];
  warranty: string | null;
  shipping_info: string | null;
  return_policy: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type VariantRow = {
  id: string;
  product_id: string;
  label: string;
  unit: string;
  price: number;
  mrp: number;
  weight_kg: number;
  in_stock: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
};

export type ReviewRow = {
  id: string;
  product_id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

export type BannerRow = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  cta_label: string;
  cta_href: string;
  color_from: string;
  color_to: string;
  product_slugs: string[];
  image_url: string | null;
  image_fit: "right" | "cover";
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type StoreSettingsRow = {
  id: boolean;
  qr_url: string | null;
  upi_id: string;
  payee_name: string;
  payment_note: string;
  rate_per_kg: number;
  service_charge: number;
  free_shipping_over: number;
  updated_at: string;
};

export type OrderRow = {
  id: string;
  code: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  landmark: string;
  city: string;
  pincode: string;
  item_total: number;
  weight_kg: number;
  rate_per_kg: number;
  shipping_cost: number;
  service_charge: number;
  total: number;
  savings: number;
  payment_proof_url: string | null;
  payment_ref: string;
  payment_note: string;
  status: OrderStatus;
  admin_note: string;
  created_at: string;
  updated_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_slug: string;
  name: string;
  image_url: string | null;
  variant_label: string;
  unit: string;
  price: number;
  mrp: number;
  qty: number;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
};

export type PageRow = {
  id: string;
  slug: string;
  title: string;
  group_name: string;
  body: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** Shape returned by the admin_dashboard_stats() RPC. */
export type DashboardStats = {
  orders_total: number;
  orders_pending: number;
  orders_confirmed: number;
  orders_cancelled: number;
  revenue_total: number;
  revenue_pending: number;
  orders_today: number;
  revenue_today: number;
  products_total: number;
  products_inactive: number;
  out_of_stock: number;
  categories_total: number;
  avg_order_value: number;
  total_weight_kg: number;
  top_products: { name: string; qty: number; revenue: number }[];
  daily: { day: string; orders: number; revenue: number }[];
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      categories: {
        Row: CategoryRow;
        Insert: Partial<CategoryRow> & { slug: string; name: string; short_name: string };
        Update: Partial<CategoryRow>;
        Relationships: [];
      };
      products: {
        Row: ProductRow;
        Insert: Partial<ProductRow> & { slug: string; name: string };
        Update: Partial<ProductRow>;
        Relationships: [];
      };
      product_variants: {
        Row: VariantRow;
        Insert: Partial<VariantRow> & { product_id: string; label: string; unit: string; price: number; mrp: number };
        Update: Partial<VariantRow>;
        Relationships: [];
      };
      product_reviews: {
        Row: ReviewRow;
        Insert: Partial<ReviewRow> & { product_id: string; reviewer_name: string; rating: number };
        Update: Partial<ReviewRow>;
        Relationships: [];
      };
      banners: {
        Row: BannerRow;
        Insert: Partial<BannerRow> & { title: string };
        Update: Partial<BannerRow>;
        Relationships: [];
      };
      store_settings: {
        Row: StoreSettingsRow;
        Insert: Partial<StoreSettingsRow> & Record<string, never>;
        Update: Partial<StoreSettingsRow>;
        Relationships: [];
      };
      orders: {
        Row: OrderRow;
        Insert: Partial<OrderRow> & { code: string; customer_name: string; customer_phone: string; address: string; city: string; pincode: string };
        Update: Partial<OrderRow>;
        Relationships: [];
      };
      pages: {
        Row: PageRow;
        Insert: Partial<PageRow> & { slug: string; title: string };
        Update: Partial<PageRow>;
        Relationships: [];
      };
      order_items: {
        Row: OrderItemRow;
        Insert: Partial<OrderItemRow> & { order_id: string; name: string; variant_label: string; unit: string; price: number; mrp: number; qty: number };
        Update: Partial<OrderItemRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      admin_dashboard_stats: {
        Args: { from_ts?: string | null; to_ts?: string | null };
        Returns: DashboardStats;
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { order_status: OrderStatus };
    CompositeTypes: Record<string, never>;
  };
};

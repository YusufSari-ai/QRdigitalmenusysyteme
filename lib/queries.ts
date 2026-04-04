import { createSupabaseBrowserClient } from "./supabaseClient";
import type { CategoryWithProducts } from "@/types/category";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";

// ─── Customer: Single nested fetch (spec §5.1) ────────────────────────────────
export async function getMenuData(): Promise<{
  data: CategoryWithProducts[] | null;
  error: Error | null;
}> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("categories")
    .select(
      `
      id,
      name,
      image_url,
      orderIndex,
      createdAt,
      products (
        id,
        name,
        image_url,
        price,
        categoryId,
        orderIndex,
        createdAt
      )
    `
    )
    .order("orderIndex", { ascending: true })
    .order("orderIndex", { ascending: true, referencedTable: "products" });

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as CategoryWithProducts[], error: null };
}

// ─── Admin: Categories CRUD ───────────────────────────────────────────────────
export async function adminGetCategories(): Promise<{
  data: Category[] | null;
  error: Error | null;
}> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("orderIndex", { ascending: true });
  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: null };
}

export async function adminCreateCategory(payload: {
  name: string;
  image_url: string;
  orderIndex: number;
}): Promise<{ error: Error | null }> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("categories").insert([payload]);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export async function adminUpdateCategory(
  id: string,
  payload: Partial<{ name: string; image_url: string; orderIndex: number }>
): Promise<{ error: Error | null }> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("categories")
    .update(payload)
    .eq("id", id);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export async function adminDeleteCategory(
  id: string
): Promise<{ error: Error | null }> {
  const supabase = createSupabaseBrowserClient();
  // Products are CASCADE deleted at DB level (spec §7.3)
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

// ─── Admin: Products CRUD ─────────────────────────────────────────────────────
export async function adminGetProducts(): Promise<{
  data: Product[] | null;
  error: Error | null;
}> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("orderIndex", { ascending: true });
  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: null };
}

export async function adminCreateProduct(payload: {
  name: string;
  image_url: string;
  price: number;
  categoryId: string;
  orderIndex: number;
}): Promise<{ error: Error | null }> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("products").insert([payload]);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export async function adminUpdateProduct(
  id: string,
  payload: Partial<{
    name: string;
    image_url: string;
    price: number;
    categoryId: string;
    orderIndex: number;
  }>
): Promise<{ error: Error | null }> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", id);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export async function adminDeleteProduct(
  id: string
): Promise<{ error: Error | null }> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

// ─── Image upload ─────────────────────────────────────────────────────────────
// Max upload size synced with ImageUploader's client-side check.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function uploadMenuImage(
  file: File,
  folder: "categories" | "products"
): Promise<{ url: string | null; error: Error | null }> {
  // Server-side size guard — client already validates, this is the backstop.
  if (file.size > MAX_IMAGE_BYTES) {
    return { url: null, error: new Error("Image must be smaller than 5 MB.") };
  }

  const supabase = createSupabaseBrowserClient();
  const ext = file.name.split(".").pop();
  const filename = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("menu-images")
    .upload(filename, file, {
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) return { url: null, error: new Error(uploadError.message) };

  const { data } = supabase.storage
    .from("menu-images")
    .getPublicUrl(filename);

  return { url: data.publicUrl, error: null };
}

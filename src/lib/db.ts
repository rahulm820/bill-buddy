import { supabase, isSupabaseConfigured } from "./supabase";
import type { Entity, QueueBill, Field } from "./store";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  phone?: string | null;
  business_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface DbCustomer { id: string; user_id: string; fields: Field[]; created_at?: string; }
interface DbItem     { id: string; user_id: string; fields: Field[]; created_at?: string; }
interface DbBill     { id: string; user_id: string; num: number; rows: QueueBill["rows"]; customer: string | null; saved_at: number; }

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) { console.error("fetchProfile:", error); return null; }
  return data as UserProfile;
}

export async function updateProfile(userId: string, updates: Partial<Omit<UserProfile, "id" | "created_at" | "updated_at">>) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) { console.error("updateProfile:", error); return null; }
  return data as UserProfile;
}

// ─── Customers ────────────────────────────────────────────────────────────────

export async function fetchCustomers(userId: string): Promise<Entity[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("customers").select("*").eq("user_id", userId).order("created_at", { ascending: true });
  if (error) { console.error("fetchCustomers:", error); return []; }
  return (data as DbCustomer[]).map(r => ({ id: r.id, fields: r.fields }));
}

export async function upsertCustomer(userId: string, entity: Entity) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from("customers").upsert({ id: entity.id, user_id: userId, fields: entity.fields });
  if (error) console.error("upsertCustomer:", error);
}

export async function deleteCustomer(id: string) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) console.error("deleteCustomer:", error);
}

// ─── Items ────────────────────────────────────────────────────────────────────

export async function fetchItems(userId: string): Promise<Entity[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("items").select("*").eq("user_id", userId).order("created_at", { ascending: true });
  if (error) { console.error("fetchItems:", error); return []; }
  return (data as DbItem[]).map(r => ({ id: r.id, fields: r.fields }));
}

export async function upsertItem(userId: string, entity: Entity) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from("items").upsert({ id: entity.id, user_id: userId, fields: entity.fields });
  if (error) console.error("upsertItem:", error);
}

export async function deleteItem(id: string) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) console.error("deleteItem:", error);
}

// ─── Bills ────────────────────────────────────────────────────────────────────

export async function fetchBills(userId: string): Promise<QueueBill[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("bills").select("*").eq("user_id", userId).order("saved_at", { ascending: true });
  if (error) { console.error("fetchBills:", error); return []; }
  return (data as DbBill[]).map(r => ({ id: r.id, num: r.num, rows: r.rows, customer: r.customer, savedAt: r.saved_at }));
}

export async function upsertBill(userId: string, bill: QueueBill) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from("bills").upsert({
    id: bill.id, user_id: userId, num: bill.num, rows: bill.rows,
    customer: bill.customer, saved_at: bill.savedAt || Date.now(),
  });
  if (error) console.error("upsertBill:", error);
}

export async function deleteBill(id: string) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from("bills").delete().eq("id", id);
  if (error) console.error("deleteBill:", error);
}

// ─── Load everything ──────────────────────────────────────────────────────────

export async function loadUserData(userId: string) {
  const [profile, customers, items, bills] = await Promise.all([
    fetchProfile(userId),
    fetchCustomers(userId),
    fetchItems(userId),
    fetchBills(userId),
  ]);
  return { profile, customers, items, bills };
}
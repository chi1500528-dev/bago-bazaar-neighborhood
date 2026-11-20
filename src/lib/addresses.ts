import { supabase } from "@/integrations/supabase/client";

export type Address = {
  id: string;
  label: string | null;
  recipient_name: string;
  phone: string;
  township_id: string | null;
  address: string;
  is_default: boolean;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const addressesTable = () => (supabase.from as any)("addresses");
export const addressesQueryKey = (uid?: string) => ["addresses", uid];
export async function fetchAddresses(): Promise<Address[]> {
  const { data, error } = await addressesTable()
    .select("id,label,recipient_name,phone,township_id,address,is_default")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

import { createClient } from "@supabase/supabase-js";

// ⚠️ بدل هاد القيمتين بالقيم ديالك من Supabase
// كاينين فـ: Project Settings > API
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "VOTRE_SUPABASE_URL";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "VOTRE_SUPABASE_ANON_KEY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

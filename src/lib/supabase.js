import { createClient } from "@supabase/supabase-js";

// ⚠️ بدل هاد القيمتين بالقيم ديالك من Supabase
// كاينين فـ: Project Settings > API
export const SUPABASE_URL = "https://thmewwpsvdsrkvuawhhi.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_bS00fApm1kOtGuJ7UNaBxw_TrIjXHil";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

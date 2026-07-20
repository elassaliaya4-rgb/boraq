import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://thmewwpsvdsrkvuawhhi.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_bS00fApm1kOtGuJ7UNaBxw_TrIjXHil";

// Tab-isolated session storage: Enables opening unlimited Chrome tabs for different agencies simultaneously
const tabIsolatedStorage = {
  getItem: (key) => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {}
  },
  removeItem: (key) => {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {}
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: tabIsolatedStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

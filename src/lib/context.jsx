import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "./supabase";
import { translations } from "./i18n";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [lang, setLang] = useState("ar");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const t = translations[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    // التحقق من الجلسة الحالية
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) loadProfile(session.user.id);
        else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadProfile(userId) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      setProfile(data);
      setLoading(false);
    } else {
      // User logged in but has no profile (was deleted). Sign them out immediately.
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return error;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        t,
        dir,
        user,
        profile,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

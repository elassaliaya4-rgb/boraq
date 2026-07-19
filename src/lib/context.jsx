import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "./supabase";
import { translations } from "./i18n";
import { Capacitor } from "@capacitor/core";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem("boraq_lang") || "ar";
    } catch (e) {
      return "ar";
    }
  });
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("theme") || "dark";
      // Apply class immediately — before first render — to prevent dark flash
      if (saved === "light") {
        document.body.classList.add("light-theme");
      } else {
        document.body.classList.remove("light-theme");
      }
      return saved;
    } catch (e) {
      return "dark";
    }
  });

  const t = translations[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch (e) {
      console.warn("localStorage access is restricted:", e);
    }
  };

  // Persist lang to localStorage whenever it changes
  const changeLang = (newLang) => {
    setLang(newLang);
    try {
      localStorage.setItem("boraq_lang", newLang);
    } catch (e) {
      console.warn("localStorage access is restricted:", e);
    }
  };

  useEffect(() => {
    if (theme === "light") {
      document.body.classList.add("light-theme");
    } else {
      document.body.classList.remove("light-theme");
    }
  }, [theme]);

  useEffect(() => {
    if (window.Notification && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  function triggerToast(message) {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, 4500);

    // Native mobile notifications (SMS / WhatsApp style popup) - Loaded Dynamically to prevent PC/web crashes
    if (Capacitor.isNativePlatform()) {
      import("@capacitor/local-notifications").then(({ LocalNotifications }) => {
        LocalNotifications.schedule({
          notifications: [
            {
              title: "البراق — Boraq Logistics",
              body: message,
              id: Math.floor(Math.random() * 100000),
              schedule: { at: new Date(Date.now() + 100) },
              sound: "beep.wav",
              channelId: "boraq-alerts", // Target the custom high-importance audio channel
              actionTypeId: "",
              extra: null
            }
          ]
        }).catch(err => console.warn("Capacitor local notification failed:", err));
      }).catch(err => console.warn("Failed to load native notifications module:", err));
    }

    if (window.Notification) {
      const showWebNotif = (txt) => {
        try {
          new Notification("البراق — Boraq Logistics", {
            body: txt,
            icon: "icon-192.png"
          });
        } catch (e) {
          console.warn("Web Notification error:", e);
        }
      };

      if (Notification.permission === "granted") {
        showWebNotif(message);
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            showWebNotif(message);
          }
        });
      }
    }

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  }

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) loadProfile(session.user.id);
        else setLoading(false);
      })
      .catch((err) => {
        console.error("getSession error:", err);
        setLoading(false);
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
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
      } else {
        // User has no database profile. Force sign out.
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.warn("SignOut error:", e);
        }
        setUser(null);
        setProfile(null);
      }
    } catch (e) {
      console.error("loadProfile error:", e);
      setUser(null);
      setProfile(null);
    } finally {
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
        setLang: changeLang,
        t,
        dir,
        user,
        profile,
        loading,
        signIn,
        signOut,
        toast,
        triggerToast,
        theme,
        toggleTheme
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

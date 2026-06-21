import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.js";
import { FONTS, COLORS } from "./constants/colors.js";
import { LoginScreen } from "./components/auth/LoginScreen.jsx";
import { Dashboard } from "./components/Dashboard.jsx";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = logged out
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
      if (!s) setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [session]);

  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg, fontFamily: "'Manrope', sans-serif", color: COLORS.textMuted, fontSize: 14 }}>
        <style>{FONTS}</style>
        Cargando...
      </div>
    );
  }

  return (
    <>
      <style>{FONTS}</style>
      {!session ? (
        <LoginScreen />
      ) : (
        <Dashboard profile={profile} onLogout={() => supabase.auth.signOut()} />
      )}
    </>
  );
}

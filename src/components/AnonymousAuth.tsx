"use client";

import { useEffect } from "react";
import { supabaseClient as supabase } from "@/lib/db";

export function AnonymousAuth() {
  useEffect(() => {
    const signInIfNeeded = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        await supabase.auth.signInAnonymously();
      }
    };

    signInIfNeeded();
  }, []);

  return null;
}

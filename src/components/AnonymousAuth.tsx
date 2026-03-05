"use client";

import { supabase } from "@/lib/db";
import { useEffect } from "react";

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

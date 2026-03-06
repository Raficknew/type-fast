"use client";

import { supabaseClient as supabase } from "@/lib/db";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

function getDisplayName(user: User): string {
  return (
    user.user_metadata?.display_name ??
    `Player #${user.id.slice(0, 6).toUpperCase()}`
  );
}

export function PlayerName() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setName(getDisplayName(data.user));
      }
    };

    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setName(getDisplayName(session.user));
        }
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!name) return null;

  return (
    <p className="text-smą">
      Playing as <span className="font-semibold">{name}</span>
    </p>
  );
}

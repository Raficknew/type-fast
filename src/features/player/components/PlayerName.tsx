"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabaseClient as supabase } from "@/lib/db";
import { getUserName } from "@/lib/pure";
import { UserNameEditDialog } from "../../users/components/UserNameEditDialog";

export function PlayerName() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!user) {
    return <div>Loading Player...</div>;
  }

  const name = getUserName(user);
  const isGenerated = name.startsWith("Player #");

  return (
    <div className="flex relative items-center gap-2">
      <p>
        Playing as <span className="font-semibold">{name}</span>
      </p>
      <UserNameEditDialog name={isGenerated ? undefined : name} />
    </div>
  );
}

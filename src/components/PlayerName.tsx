"use client";

import { useEffect, useState } from "react";
import { supabaseClient as supabase } from "@/lib/db";
import { getUserName } from "@/lib/pure";

export function PlayerName() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setName(getUserName(data.user));
      }
    };

    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setName(getUserName(session.user));
        }
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!name) {
    return <div>Loading Player...</div>;
  }

  return (
    <p className="text-smą">
      Playing as <span className="font-semibold">{name}</span>
    </p>
  );
}

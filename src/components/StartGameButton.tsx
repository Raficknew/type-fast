"use client";
import { supabase } from "@/lib/db";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

export function StartGameButton({
  createRace,
}: {
  createRace: () => Promise<void>;
}) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel("public:race")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "race",
        },
        () => {
          redirect("/");
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  });

  const handleClick = async () => {
    setIsLoading(true);
    await createRace();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="bg-blue-400 px-10 py-5 rounded-sm text-white text-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? "Starting..." : "Start Game"}
    </button>
  );
}

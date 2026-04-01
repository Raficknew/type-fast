"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabaseClient as supabase } from "@/lib/db";

export function StartGameButton({
  createRace,
}: {
  createRace: () => Promise<void>;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

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
          router.refresh();
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
    <Button type="button" onClick={handleClick} disabled={isLoading} size="lg">
      {isLoading ? "Starting..." : "Start Game"}
    </Button>
  );
}

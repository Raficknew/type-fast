"use client";

import { Moon02Icon, Sun01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export default function ThemeSwitcher() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const currentTheme = resolvedTheme === "dark" ? "dark" : "light";
  const changeTheme = currentTheme === "light" ? "dark" : "light";

  return (
    <Button
      className="fixed left-10 top-10 z-20"
      onClick={() => setTheme(changeTheme)}
      variant="outline"
      size="icon"
    >
      <HugeiconsIcon icon={currentTheme === "light" ? Sun01Icon : Moon02Icon} />
    </Button>
  );
}

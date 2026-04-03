"use client";

import { Moon02Icon, Sun01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const currentTheme =
    theme === "light" || theme === "system" ? "light" : "dark";
  const changeTheme = currentTheme === "light" ? "dark" : "light";

  return (
    <Button
      className="fixed left-10 top-10"
      onClick={() => setTheme(changeTheme)}
      variant="outline"
      size="icon"
    >
      <HugeiconsIcon icon={currentTheme === "light" ? Sun01Icon : Moon02Icon} />
    </Button>
  );
}

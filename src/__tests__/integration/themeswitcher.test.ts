import { cleanup } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "../rtl_setup /test-utils";

const { useThemeMock, setThemeMock, resolvedThemeRef } = vi.hoisted(() => {
  const resolvedThemeRef: { current: string | undefined } = {
    current: "light",
  };

  return {
    useThemeMock: vi.fn(),
    setThemeMock: vi.fn(),
    resolvedThemeRef,
  };
});

vi.mock("next-themes", () => ({
  useTheme: useThemeMock,
  ThemeProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

import ThemeSwitcher from "@/components/ThemeSwitcher";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ThemeSwitcher integration", () => {
  beforeEach(() => {
    useThemeMock.mockReset();
    setThemeMock.mockReset();
    resolvedThemeRef.current = "light";

    useThemeMock.mockImplementation(() => ({
      resolvedTheme: resolvedThemeRef.current,
      setTheme: setThemeMock,
    }));
  });

  it("renders after mount and toggles from light to dark", async () => {
    const { user } = render(React.createElement(ThemeSwitcher));

    await waitFor(() => {
      expect(screen.getByRole("button")).not.toBeNull();
    });

    await user.click(screen.getByRole("button"));

    expect(setThemeMock).toHaveBeenCalledWith("dark");
  });

  it("toggles from dark to light", async () => {
    resolvedThemeRef.current = "dark";

    const { user } = render(React.createElement(ThemeSwitcher));

    await waitFor(() => {
      expect(screen.getByRole("button")).not.toBeNull();
    });

    await user.click(screen.getByRole("button"));

    expect(setThemeMock).toHaveBeenCalledWith("light");
  });

  it("treats unknown theme as light and switches to dark", async () => {
    resolvedThemeRef.current = undefined;

    const { user } = render(React.createElement(ThemeSwitcher));

    await waitFor(() => {
      expect(screen.getByRole("button")).not.toBeNull();
    });

    await user.click(screen.getByRole("button"));

    expect(setThemeMock).toHaveBeenCalledWith("dark");
  });
});

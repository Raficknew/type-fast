import { cleanup } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "../rtl_setup /test-utils";

const {
  routerRefreshMock,
  channelMock,
  removeChannelMock,
  onMock,
  subscribeMock,
  createRaceMock,
  postgresChangeCallbackRef,
} = vi.hoisted(() => {
  const postgresChangeCallbackRef: { current: (() => void) | null } = {
    current: null,
  };

  return {
    routerRefreshMock: vi.fn(),
    channelMock: vi.fn(),
    removeChannelMock: vi.fn(),
    onMock: vi.fn(),
    subscribeMock: vi.fn(),
    createRaceMock: vi.fn(),
    postgresChangeCallbackRef,
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefreshMock,
  }),
}));

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock("@/lib/db", () => ({
  supabaseClient: {
    channel: channelMock,
    removeChannel: removeChannelMock,
  },
}));

import { StartGameButton } from "@/components/StartGameButton";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("StartGameButton integration", () => {
  beforeEach(() => {
    routerRefreshMock.mockReset();
    channelMock.mockReset();
    removeChannelMock.mockReset();
    onMock.mockReset();
    subscribeMock.mockReset();
    createRaceMock.mockReset();
    postgresChangeCallbackRef.current = null;

    const channelInstance = {
      on: onMock,
      subscribe: subscribeMock,
    };

    onMock.mockImplementation((_, __, callback) => {
      postgresChangeCallbackRef.current = callback as () => void;
      return channelInstance;
    });

    subscribeMock.mockReturnValue(channelInstance);
    channelMock.mockReturnValue(channelInstance);
  });

  it("subscribes to race realtime updates and refreshes on postgres change", async () => {
    const { unmount } = render(
      React.createElement(StartGameButton, {
        createRace: createRaceMock,
      }),
    );

    expect(channelMock).toHaveBeenCalledWith("public:race");
    expect(onMock).toHaveBeenCalledWith(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "race",
      },
      expect.any(Function),
    );

    expect(postgresChangeCallbackRef.current).not.toBeNull();
    if (!postgresChangeCallbackRef.current) {
      throw new Error("Expected postgres callback to be registered");
    }

    postgresChangeCallbackRef.current();
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);

    unmount();
    expect(removeChannelMock).toHaveBeenCalledTimes(1);
  });

  it("shows loading state and disables button while createRace is pending", async () => {
    let resolveCreateRace: (() => void) | null = null;
    createRaceMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveCreateRace = resolve;
        }),
    );

    const { user } = render(
      React.createElement(StartGameButton, {
        createRace: createRaceMock,
      }),
    );

    const button = screen.getByRole("button", { name: "Start Game" });
    await user.click(button);

    expect(createRaceMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Starting..." })).not.toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Starting..." })
        .hasAttribute("disabled"),
    ).toBe(true);

    resolveCreateRace!();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Starting..." }),
      ).not.toBeNull();
    });
  });
});

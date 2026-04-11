import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMocks } from "@/__tests__/mocks/mocks";

const {
  ensurePlayerRoundRowMock,
  updatePlayerLiveStatsMock,
  restartRaceMock,
  getPlayerStatsMock,
  getSessionMock,
  onAuthStateChangeMock,
  channelMock,
  removeChannelMock,
  routerPushMock,
  routerRefreshMock,
} = vi.hoisted(() => ({
  ensurePlayerRoundRowMock: vi.fn(),
  updatePlayerLiveStatsMock: vi.fn(),
  restartRaceMock: vi.fn(),
  getPlayerStatsMock: vi.fn(),
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  channelMock: vi.fn(),
  removeChannelMock: vi.fn(),
  routerPushMock: vi.fn(),
  routerRefreshMock: vi.fn(),
}));

vi.mock("@/features/player/actions/playerStats", () => ({
  ensurePlayerRoundRow: ensurePlayerRoundRowMock,
  updatePlayerLiveStats: updatePlayerLiveStatsMock,
  getPlayerStats: getPlayerStatsMock,
}));

vi.mock("@/features/race/actions/race", () => ({
  restartRace: restartRaceMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
    refresh: routerRefreshMock,
  }),
}));

vi.mock("motion/react", () => ({
  Reorder: {
    Group: ({
      as: Component = "div",
      children,
      values: _values,
      onReorder: _onReorder,
      axis: _axis,
      ...props
    }: any) => React.createElement(Component, props, children),
    Item: ({
      as: Component = "div",
      children,
      dragListener: _dragListener,
      layout: _layout,
      transition: _transition,
      value: _value,
      ...props
    }: any) => React.createElement(Component, props, children),
  },
  useReducedMotion: () => true,
}));

vi.mock("@/features/race/components/RaceTimer", () => ({
  RaceTimer: ({ title, onTick, action }: any) => {
    React.useEffect(() => {
      onTick?.(50);
    }, [onTick]);

    return React.createElement(
      "button",
      { type: "button", onClick: action },
      title,
    );
  },
}));

vi.mock("@/lib/db", () => ({
  supabaseClient: {
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
    },
    channel: channelMock,
    removeChannel: removeChannelMock,
  },
}));

import { TypeTest } from "@/features/race/components/TypeTest";
import { render } from "../rtl_setup /test-utils";

afterEach(() => {
  cleanup();
});

describe("TypeTest integration", () => {
  beforeEach(() => {
    resetMocks(
      ensurePlayerRoundRowMock,
      updatePlayerLiveStatsMock,
      restartRaceMock,
      getPlayerStatsMock,
      getSessionMock,
      onAuthStateChangeMock,
      channelMock,
      removeChannelMock,
      routerPushMock,
      routerRefreshMock,
    );

    ensurePlayerRoundRowMock.mockResolvedValue({
      wpm: 0,
      user_id: "user-1",
      accuracy: 100,
      live_progress: "hello",
      round: 1,
    });
    updatePlayerLiveStatsMock.mockResolvedValue(undefined);
    restartRaceMock.mockResolvedValue({ status: "not_ready" });

    getPlayerStatsMock.mockResolvedValue([
      {
        id: "row-1",
        user_id: "user-1",
        name: "Alice",
        round: 1,
        wpm: 45,
        accuracy: 95,
        live_progress: "hello",
      },
      {
        id: "row-2",
        user_id: "user-2",
        name: "Bob",
        round: 1,
        wpm: 72,
        accuracy: 97,
        live_progress: "FINISHED",
      },
    ]);

    getSessionMock.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1",
            user_metadata: { name: "Alice" },
          },
          access_token: "token-1",
        },
      },
    });

    onAuthStateChangeMock.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });

    channelMock.mockImplementation(() => {
      const channel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      };

      return channel;
    });
  });

  it("renders race state and player names with live progress, wpm and accuracy", async () => {
    render(
      React.createElement(TypeTest, {
        sentence: "hello world",
        round: 1,
        raceId: "race-1",
        endTime: "2099-01-01T00:00:00.000Z",
        serverNow: "2098-12-31T23:59:00.000Z",
      }),
    );

    await waitFor(() => {
      expect(getPlayerStatsMock).toHaveBeenCalledWith("race-1", 1);
      expect(screen.getByText("Alice")).not.toBeNull();
      expect(screen.getByText("Bob")).not.toBeNull();
    });

    expect(screen.getByText("round 1")).not.toBeNull();
    expect(screen.getByRole("main").textContent).toContain("hello world");
    expect(screen.getByText("Alice")).not.toBeNull();
    expect(screen.getByText("Bob")).not.toBeNull();

    const aliceRow = screen.getByText("Alice").closest("tr");
    const bobRow = screen.getByText("Bob").closest("tr");

    expect(aliceRow).not.toBeNull();
    expect(bobRow).not.toBeNull();

    if (!aliceRow || !bobRow) {
      throw new Error("Expected player rows to be present");
    }

    expect(within(aliceRow).getByText("hello")).not.toBeNull();
    expect(within(aliceRow).getByText("0")).not.toBeNull();
    expect(within(aliceRow).getByText("100%")).not.toBeNull();

    expect(within(bobRow).getByText("FINISHED")).not.toBeNull();
    expect(within(bobRow).getByText("72")).not.toBeNull();
    expect(within(bobRow).getByText("97%")).not.toBeNull();
  });

  it("updates current user accuracy, wpm and live progress while typing", async () => {
    const user = userEvent.setup();

    const { container } = render(
      React.createElement(TypeTest, {
        sentence: "hello world",
        round: 1,
        raceId: "race-1",
        endTime: "2099-01-01T00:00:00.000Z",
        serverNow: "2098-12-31T23:59:00.000Z",
      }),
    );

    await waitFor(() => {
      expect(getPlayerStatsMock).toHaveBeenCalledWith("race-1", 1);
    });

    const input = container.querySelector(
      'input[type="text"]',
    ) as HTMLInputElement | null;

    expect(input).not.toBeNull();
    if (!input) {
      throw new Error("Expected typing input to be present");
    }

    input.focus();
    await user.type(input, "hx");

    await waitFor(() => {
      const aliceRow = screen.getByText("Alice").closest("tr");
      expect(aliceRow).not.toBeNull();

      if (!aliceRow) {
        throw new Error("Alice row missing");
      }

      expect(within(aliceRow).getByText("91%")).not.toBeNull();
      expect(within(aliceRow).getByText("hello")).not.toBeNull();
    });

    await user.clear(input);
    await user.type(input, "hello ");

    await waitFor(() => {
      const aliceRow = screen.getByText("Alice").closest("tr");
      expect(aliceRow).not.toBeNull();

      if (!aliceRow) {
        throw new Error("Alice row missing");
      }

      expect(within(aliceRow).getByText("world")).not.toBeNull();
      expect(within(aliceRow).getByText("6")).not.toBeNull();
    });

    await user.type(input, "world");

    await waitFor(() => {
      const aliceRow = screen.getByText("Alice").closest("tr");
      expect(aliceRow).not.toBeNull();

      if (!aliceRow) {
        throw new Error("Alice row missing");
      }

      expect(within(aliceRow).getByText("FINISHED")).not.toBeNull();
      expect(updatePlayerLiveStatsMock).toHaveBeenCalledWith(
        "race-1",
        "user-1",
        "token-1",
        1,
        12,
        91,
        "FINISHED",
      );
    });
  });
});

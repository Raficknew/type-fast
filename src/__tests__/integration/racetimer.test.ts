import { act, cleanup, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMocks } from "@/__tests__/mocks/mocks";

const { actionMock, onTickMock, getServerClockOffsetMock, getTimeLeftMock } =
  vi.hoisted(() => ({
    actionMock: vi.fn(),
    onTickMock: vi.fn(),
    getServerClockOffsetMock: vi.fn(),
    getTimeLeftMock: vi.fn(),
  }));

vi.mock("@/lib/pure", () => ({
  getServerClockOffset: getServerClockOffsetMock,
  getTimeLeft: getTimeLeftMock,
}));

import { RaceTimer } from "@/features/race/components/RaceTimer";
import { render } from "../rtl_setup /test-utils";

describe("RaceTimer integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetMocks(
      actionMock,
      onTickMock,
      getServerClockOffsetMock,
      getTimeLeftMock,
    );

    getServerClockOffsetMock.mockReturnValue(2_000);
    getTimeLeftMock.mockReturnValue(3);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders initial countdown and calls pure helpers with expected values", () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    render(
      React.createElement(RaceTimer, {
        title: "Next round in",
        endTime: "2026-01-01T00:00:05.000Z",
        serverNow: "2026-01-01T00:00:02.000Z",
        action: actionMock,
        onTick: onTickMock,
      }),
    );

    expect(getServerClockOffsetMock).toHaveBeenCalledWith(
      "2026-01-01T00:00:02.000Z",
    );
    expect(getTimeLeftMock).toHaveBeenCalledWith(
      "2026-01-01T00:00:05.000Z",
      Date.now() + 2_000,
    );

    expect(screen.getByText("Next round in")).not.toBeNull();
    expect(screen.getByText("3")).not.toBeNull();
    expect(onTickMock).toHaveBeenCalledWith(3);
  });

  it("counts down every second, reports ticks, and calls action after 500ms at zero", async () => {
    render(
      React.createElement(RaceTimer, {
        title: "Ends in",
        endTime: "2026-01-01T00:00:05.000Z",
        serverNow: "2026-01-01T00:00:02.000Z",
        action: actionMock,
        onTick: onTickMock,
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText("2")).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText("1")).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });

    expect(screen.getByText("0")).not.toBeNull();
    expect(onTickMock).toHaveBeenCalledWith(0);
    expect(actionMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(499);
    });
    expect(actionMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(actionMock).toHaveBeenCalledTimes(1);
  });

  it("cancels pending action timeout on unmount", async () => {
    const { unmount } = render(
      React.createElement(RaceTimer, {
        title: "Ends in",
        endTime: "2026-01-01T00:00:05.000Z",
        serverNow: "2026-01-01T00:00:02.000Z",
        action: actionMock,
        onTick: onTickMock,
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(3_000);
    });

    expect(screen.getByText("0")).not.toBeNull();
    expect(actionMock).not.toHaveBeenCalled();

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });

    expect(actionMock).not.toHaveBeenCalled();
  });
});

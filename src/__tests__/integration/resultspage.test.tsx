import { cleanup, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMocks } from "@/__tests__/mocks/mocks";

const {
  getFinalPlayersStatsMock,
  getRaceMock,
  deleteRaceMock,
  summarizeResultsForPlayersMock,
  redirectMock,
} = vi.hoisted(() => ({
  getFinalPlayersStatsMock: vi.fn(),
  getRaceMock: vi.fn(),
  deleteRaceMock: vi.fn(),
  summarizeResultsForPlayersMock: vi.fn(),
  redirectMock: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/features/player/actions/playerStats", () => ({
  getFinalPlayersStats: getFinalPlayersStatsMock,
}));

vi.mock("@/features/race/actions/race", () => ({
  getRace: getRaceMock,
  deleteRace: deleteRaceMock,
}));

vi.mock("@/lib/pure", () => ({
  summarizeResultsForPlayers: summarizeResultsForPlayersMock,
}));

vi.mock("@/features/race/components/RaceTimer", () => ({
  RaceTimer: ({ title }: { title: string }) =>
    React.createElement("p", null, title),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import ResultsPage from "@/app/results/[raceId]/page";
import { render } from "../rtl_setup /test-utils";

afterEach(() => {
  cleanup();
});

describe("ResultsPage integration", () => {
  beforeEach(() => {
    resetMocks(
      getFinalPlayersStatsMock,
      getRaceMock,
      deleteRaceMock,
      summarizeResultsForPlayersMock,
      redirectMock,
    );
  });

  it("renders heading and leaderboard for a valid race", async () => {
    const raceId = "d9b1c8e7-5a1b-4c3e-9f0a-2b6c8e7f9a1b";

    getFinalPlayersStatsMock.mockResolvedValue([
      { id: "1", user_id: "u-1", name: "Alice", wpm: 80, accuracy: 98 },
      { id: "2", user_id: "u-2", name: "Bob", wpm: 72, accuracy: 95 },
    ]);
    getRaceMock.mockResolvedValue({
      id: raceId,
      end_time: "2099-01-01T00:00:00.000Z",
    });
    summarizeResultsForPlayersMock.mockReturnValue([
      {
        userId: "u-1",
        name: "Alice",
        averageWpm: 80,
        averageAccuracy: 98,
      },
      {
        userId: "u-2",
        name: "Bob",
        averageWpm: 72,
        averageAccuracy: 95,
      },
    ]);

    const view = await ResultsPage({ params: Promise.resolve({ raceId }) });
    render(React.createElement(React.Fragment, null, view));

    expect(screen.getByText("Results for Race")).not.toBeNull();
    expect(screen.getByText("#D9B1C8E")).not.toBeNull();
    expect(screen.getByText("Ends in")).not.toBeNull();

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");

    expect(rows.length).toBe(3);
    expect(screen.getByText("Alice")).not.toBeNull();
    expect(screen.getByText("80.00")).not.toBeNull();
    expect(screen.getByText("98.00%")).not.toBeNull();
    expect(screen.getByText("Bob")).not.toBeNull();
    expect(screen.getByText("72.00")).not.toBeNull();
    expect(screen.getByText("95.00%")).not.toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects to home when race is missing", async () => {
    const raceId = "missing-race";

    getFinalPlayersStatsMock.mockResolvedValue([]);
    getRaceMock.mockResolvedValue(null);

    await expect(
      ResultsPage({ params: Promise.resolve({ raceId }) }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/");
  });
});

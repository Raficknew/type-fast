import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseQueryBuilderHarness,
  resetMocks,
} from "@/__tests__/mocks/mocks";

const {
  fromMock,
  selectMock,
  eqMock,
  maybeSingleMock,
  upsertMock,
  insertMock,
  updateMock,
  orderMock,
  assertAuthenticatedUserMock,
  assertMissingConflictConstraintErrorMock,
} = vi.hoisted(() => ({
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  upsertMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  orderMock: vi.fn(),
  assertAuthenticatedUserMock: vi.fn(),
  assertMissingConflictConstraintErrorMock: vi.fn(),
}));

const queryHarness = createSupabaseQueryBuilderHarness({
  selectMock,
  eqMock,
  maybeSingleMock,
  upsertMock,
  insertMock,
  updateMock,
  orderMock,
});
const { queueSupabaseResults } = queryHarness;

vi.mock("@/lib/db", () => ({
  supabaseServer: {
    from: fromMock,
  },
}));

vi.mock("@/features/player/permissions/player", () => ({
  assertAuthenticatedUser: assertAuthenticatedUserMock,
  assertMissingConflictConstraintError:
    assertMissingConflictConstraintErrorMock,
}));

import {
  ensurePlayerRoundRow,
  getFinalPlayersStats,
  getPlayerStats,
  updatePlayerLiveStats,
} from "@/features/player/actions/playerStats";

describe("player stats server actions", () => {
  beforeEach(() => {
    queryHarness.reset();
    resetMocks(
      fromMock,
      selectMock,
      eqMock,
      maybeSingleMock,
      upsertMock,
      insertMock,
      updateMock,
      orderMock,
    );
    resetMocks(
      assertAuthenticatedUserMock,
      assertMissingConflictConstraintErrorMock,
    );

    fromMock.mockImplementation(() => queryHarness.createBuilder());
    assertAuthenticatedUserMock.mockResolvedValue(undefined);
  });

  it("getPlayerStats returns rows from Supabase", async () => {
    const rows = [
      {
        id: "s1",
        user_id: "u1",
        name: "Alice",
        round: 1,
        wpm: 80,
        accuracy: 98,
        live_progress: "FINISHED",
      },
    ];
    queueSupabaseResults({ data: rows, error: null });

    await expect(getPlayerStats("race-1", 1)).resolves.toEqual(rows);
    expect(orderMock).toHaveBeenCalledWith("name");
  });

  it("getPlayerStats returns an empty array when data is null", async () => {
    queueSupabaseResults({ data: null, error: null });

    await expect(getPlayerStats("race-1", 1)).resolves.toEqual([]);
  });

  it("getPlayerStats throws on Supabase error", async () => {
    queueSupabaseResults({ data: null, error: { message: "fetch failed" } });

    await expect(getPlayerStats("race-1", 1)).rejects.toThrow("fetch failed");
  });

  it("ensurePlayerRoundRow returns mapped row when upsert succeeds", async () => {
    queueSupabaseResults(
      { error: null },
      {
        data: {
          wpm: 75,
          accuracy: 93,
          live_progress: "FINISHED",
          round: 2,
        },
        error: null,
      },
    );

    await expect(
      ensurePlayerRoundRow("race-1", "user-1", "token", "Alice", 2),
    ).resolves.toEqual({
      wpm: 75,
      user_id: "user-1",
      accuracy: 93,
      live_progress: "FINISHED",
      round: 2,
    });

    expect(assertAuthenticatedUserMock).toHaveBeenCalledWith("user-1", "token");
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });

  it("ensurePlayerRoundRow executes fallback flow when upsert reports conflict error", async () => {
    queueSupabaseResults(
      {
        error: {
          message:
            "no unique or exclusion constraint matching the ON CONFLICT specification",
        },
      },
      { data: { wpm: 90 }, error: null },
      {
        data: {
          wpm: 90,
          accuracy: 99,
          live_progress: "FINISHED",
          round: 2,
        },
        error: null,
      },
    );

    await expect(
      ensurePlayerRoundRow("race-1", "user-1", "token", "Alice", 2),
    ).resolves.toEqual({
      wpm: 90,
      user_id: "user-1",
      accuracy: 99,
      live_progress: "FINISHED",
      round: 2,
    });

    expect(assertMissingConflictConstraintErrorMock).toHaveBeenCalledTimes(1);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("ensurePlayerRoundRow inserts when fallback lookup finds no row", async () => {
    queueSupabaseResults(
      {
        error: {
          message:
            "no unique or exclusion constraint matching the ON CONFLICT specification",
        },
      },
      { data: null, error: null },
      { error: null },
      { data: null, error: null },
    );

    await expect(
      ensurePlayerRoundRow("race-1", "user-1", "token", "Alice", 2),
    ).resolves.toEqual({
      wpm: undefined,
      user_id: "user-1",
      accuracy: null,
      live_progress: null,
      round: null,
    });

    expect(insertMock).toHaveBeenCalledWith({
      name: "Alice",
      race_id: "race-1",
      user_id: "user-1",
      round: 2,
    });
  });

  it("ensurePlayerRoundRow throws when fallback insert fails", async () => {
    queueSupabaseResults(
      {
        error: {
          message:
            "no unique or exclusion constraint matching the ON CONFLICT specification",
        },
      },
      { data: null, error: null },
      { error: { message: "insert failed" } },
    );

    await expect(
      ensurePlayerRoundRow("race-1", "user-1", "token", "Alice", 2),
    ).rejects.toThrow("insert failed");
  });

  it("updatePlayerLiveStats sanitizes numeric values before update", async () => {
    queueSupabaseResults({});

    await updatePlayerLiveStats(
      "race-1",
      "user-1",
      "token",
      2,
      -3.4,
      130.1,
      "TYPING",
    );

    expect(assertAuthenticatedUserMock).toHaveBeenCalledWith("user-1", "token");
    expect(updateMock).toHaveBeenCalledWith({
      wpm: 0,
      accuracy: 100,
      live_progress: "TYPING",
    });
  });

  it("updatePlayerLiveStats coerces non-finite values to zero", async () => {
    queueSupabaseResults({});

    await updatePlayerLiveStats(
      "race-1",
      "user-1",
      "token",
      2,
      Number.POSITIVE_INFINITY,
      Number.NaN,
      "TYPING",
    );

    expect(updateMock).toHaveBeenCalledWith({
      wpm: 0,
      accuracy: 0,
      live_progress: "TYPING",
    });
  });

  it("getFinalPlayersStats returns ranked rows", async () => {
    const rows = [
      {
        id: "s1",
        user_id: "u1",
        name: "Alice",
        round: 1,
        wpm: 80,
        accuracy: 99,
        live_progress: "FINISHED",
      },
    ];
    queueSupabaseResults({ data: rows, error: null });

    await expect(getFinalPlayersStats("race-1")).resolves.toEqual(rows);
    expect(orderMock).toHaveBeenNthCalledWith(1, "wpm", { ascending: false });
    expect(orderMock).toHaveBeenNthCalledWith(2, "accuracy", {
      ascending: false,
    });
    expect(orderMock).toHaveBeenNthCalledWith(3, "name");
  });

  it("getFinalPlayersStats returns [] when no rows are found", async () => {
    queueSupabaseResults({ data: null, error: null });

    await expect(getFinalPlayersStats("race-1")).resolves.toEqual([]);
  });
});

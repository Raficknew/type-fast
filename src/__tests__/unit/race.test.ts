import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseQueryBuilderHarness,
  resetMocks,
} from "@/__tests__/mocks/mocks";

const {
  fromMock,
  selectMock,
  limitMock,
  eqMock,
  singleMock,
  maybeSingleMock,
  insertMock,
  deleteMock,
  updateMock,
  revalidatePathMock,
  redirectMock,
  getRandomSentenceMock,
  getRoundEndTimeMock,
  isStaleRaceMock,
} = vi.hoisted(() => {
  return {
    fromMock: vi.fn(),
    selectMock: vi.fn(),
    limitMock: vi.fn(),
    eqMock: vi.fn(),
    singleMock: vi.fn(),
    maybeSingleMock: vi.fn(),
    insertMock: vi.fn(),
    deleteMock: vi.fn(),
    updateMock: vi.fn(),
    revalidatePathMock: vi.fn(),
    redirectMock: vi.fn(),
    getRandomSentenceMock: vi.fn(),
    getRoundEndTimeMock: vi.fn(),
    isStaleRaceMock: vi.fn(),
  };
});

const queryHarness = createSupabaseQueryBuilderHarness({
  selectMock,
  limitMock,
  eqMock,
  singleMock,
  maybeSingleMock,
  insertMock,
  deleteMock,
  updateMock,
});
const { queueSupabaseResults } = queryHarness;

vi.mock("@/lib/db", () => ({
  supabaseServer: {
    from: fromMock,
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/pure", () => ({
  getRandomSentence: getRandomSentenceMock,
  getRoundEndTime: getRoundEndTimeMock,
  isStaleRace: isStaleRaceMock,
}));

import {
  createRace,
  deleteRace,
  deleteRaceIfStale,
  getRace,
  restartRace,
} from "@/features/race/actions/race";

describe("race server actions", () => {
  beforeEach(() => {
    queryHarness.reset();
    resetMocks(
      fromMock,
      selectMock,
      limitMock,
      eqMock,
      singleMock,
      maybeSingleMock,
      insertMock,
      deleteMock,
      updateMock,
    );
    resetMocks(
      revalidatePathMock,
      redirectMock,
      getRandomSentenceMock,
      getRoundEndTimeMock,
      isStaleRaceMock,
    );

    fromMock.mockImplementation(() => queryHarness.createBuilder());
    redirectMock.mockImplementation(() => undefined);
    getRandomSentenceMock.mockReturnValue("mock sentence");
    getRoundEndTimeMock.mockReturnValue("2026-01-01T00:01:00.000Z");
  });

  it("createRace revalidates and exits when a race already exists", async () => {
    queueSupabaseResults({ data: [{ id: "race-1" }] });

    await createRace();

    expect(revalidatePathMock).toHaveBeenCalledWith("/");
    expect(insertMock).not.toHaveBeenCalled();
    expect(getRandomSentenceMock).not.toHaveBeenCalled();
  });

  it("createRace inserts a race when none exists", async () => {
    queueSupabaseResults({ data: [] }, { error: null });

    await createRace();

    expect(insertMock).toHaveBeenCalledWith({
      sentence: "mock sentence",
      end_time: "2026-01-01T00:01:00.000Z",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });

  it("deleteRace revalidates and exits when race cannot be fetched", async () => {
    queueSupabaseResults({ data: null, error: { message: "not found" } });

    await deleteRace("race-1");

    expect(revalidatePathMock).toHaveBeenCalledWith("/");
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deleteRace throws when race has not ended", async () => {
    queueSupabaseResults({ data: { round: 1 }, error: null });

    await expect(deleteRace("race-1")).rejects.toThrow(
      "Race has not ended yet",
    );
  });

  it("deleteRace deletes the race when it has ended", async () => {
    queueSupabaseResults({ data: { round: 5 }, error: null }, { error: null });

    await deleteRace("race-1");

    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });

  it("deleteRaceIfStale returns false when fetch fails", async () => {
    queueSupabaseResults({ data: null, error: { message: "not found" } });

    await expect(deleteRaceIfStale("race-1")).resolves.toBe(false);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deleteRaceIfStale returns false when race is not stale", async () => {
    queueSupabaseResults({
      data: { end_time: "2026-01-01T00:00:00.000Z" },
      error: null,
    });
    isStaleRaceMock.mockReturnValue(false);

    await expect(deleteRaceIfStale("race-1")).resolves.toBe(false);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deleteRaceIfStale deletes and returns true when stale", async () => {
    queueSupabaseResults(
      { data: { end_time: "2026-01-01T00:00:00.000Z" }, error: null },
      { error: null },
    );
    isStaleRaceMock.mockReturnValue(true);

    await expect(deleteRaceIfStale("race-1")).resolves.toBe(true);
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });

  it("restartRace returns race_ended when current round is max rounds", async () => {
    await expect(restartRace("race-1", 6)).resolves.toEqual({
      status: "race_ended",
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("restartRace returns out_of_date when current race row is missing", async () => {
    queueSupabaseResults({ data: null, error: { message: "missing" } });

    await expect(restartRace("race-1", 1)).resolves.toEqual({
      status: "out_of_date",
    });
  });

  it("restartRace returns not_ready when round is active and not all players finished", async () => {
    queueSupabaseResults(
      { data: { end_time: "2999-01-01T00:00:00.000Z" }, error: null },
      {
        data: [{ live_progress: "TYPING" }, { live_progress: "FINISHED" }],
        error: null,
      },
    );

    await expect(restartRace("race-1", 1)).resolves.toEqual({
      status: "not_ready",
    });
  });

  it("restartRace advances race when ready", async () => {
    queueSupabaseResults(
      { data: { end_time: "2000-01-01T00:00:00.000Z" }, error: null },
      { data: [], error: null },
      { data: { id: "race-1" }, error: null },
    );

    await expect(restartRace("race-1", 1)).resolves.toEqual({
      status: "advanced",
    });
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it("restartRace returns out_of_date when compare-and-swap update misses", async () => {
    queueSupabaseResults(
      { data: { end_time: "2000-01-01T00:00:00.000Z" }, error: null },
      { data: [{ live_progress: "FINISHED" }], error: null },
      { data: null, error: null },
    );

    await expect(restartRace("race-1", 1)).resolves.toEqual({
      status: "out_of_date",
    });
  });

  it("getRace returns a race when query succeeds", async () => {
    queueSupabaseResults({ data: { id: "race-1" }, error: null });

    await expect(getRace("race-1")).resolves.toEqual({ id: "race-1" });
  });

  it("getRace redirects when query fails", async () => {
    queueSupabaseResults({ data: null, error: { message: "not found" } });
    redirectMock.mockImplementation(() => {
      throw new Error("redirected");
    });

    await expect(getRace("race-1")).rejects.toThrow("redirected");
    expect(redirectMock).toHaveBeenCalledWith("/");
  });
});

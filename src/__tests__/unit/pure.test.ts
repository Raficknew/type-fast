import type { User } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ROUND_TIME } from "@/gameSettings";
import {
  calculateAccuracy,
  getRaceScopedDisplayNames,
  getRandomSentence,
  getRoundEndTime,
  getServerClockOffset,
  getTimeLeft,
  getUserName,
  isStaleRace,
  summarizeResultsForPlayers,
} from "@/lib/pure";
import { sentences } from "@/lib/sentences";

describe("getRoundEndTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns an ISO string", () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const result = getRoundEndTime();
    expect(typeof result).toBe("string");
    expect(() => new Date(result)).not.toThrow();
  });

  it("returns a time exactly ROUND_TIME seconds in the future", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    vi.setSystemTime(now);
    const result = getRoundEndTime();
    const expectedTime = new Date(
      now.getTime() + ROUND_TIME * 1000,
    ).toISOString();
    expect(result).toBe(expectedTime);
  });
});

describe("getTimeLeft", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the correct number of seconds remaining", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    vi.setSystemTime(now);
    const endTime = new Date(now.getTime() + 30_000).toISOString();
    expect(getTimeLeft(endTime)).toBe(30);
  });

  it("returns 0 when the end time is now", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    vi.setSystemTime(now);
    expect(getTimeLeft(now.toISOString())).toBe(0);
  });

  it("returns a negative value when end time has already passed", () => {
    const now = new Date("2026-01-01T00:00:10.000Z");
    vi.setSystemTime(now);
    const endTime = new Date("2026-01-01T00:00:00.000Z").toISOString();
    expect(getTimeLeft(endTime)).toBe(-10);
  });

  it("floors partial seconds", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    vi.setSystemTime(now);
    const endTime = new Date(now.getTime() + 10_500).toISOString();
    expect(getTimeLeft(endTime)).toBe(10);
  });

  it("supports a server-referenced current time", () => {
    const clientNow = new Date("2026-01-01T00:00:00.000Z");
    const serverNow = new Date("2026-01-01T00:00:30.000Z");
    vi.setSystemTime(clientNow);

    const endTime = new Date("2026-01-01T00:01:00.000Z").toISOString();
    expect(getTimeLeft(endTime, serverNow.getTime())).toBe(30);
  });
});

describe("getServerClockOffset", () => {
  it("returns how far server time is ahead of client time", () => {
    const clientNow = new Date("2026-01-01T00:00:00.000Z");
    vi.setSystemTime(clientNow);

    const serverNow = new Date("2026-01-01T00:00:30.000Z").toISOString();
    expect(getServerClockOffset(serverNow)).toBe(30_000);
  });
});

describe("isStaleRace", () => {
  it("returns true when end time is older than 2 minutes", () => {
    const now = new Date("2026-01-01T00:05:00.000Z");
    const endTime = new Date("2026-01-01T00:02:59.999Z").toISOString();

    expect(isStaleRace(endTime, now.getTime())).toBe(true);
  });

  it("returns false exactly at the 2-minute threshold", () => {
    const now = new Date("2026-01-01T00:05:00.000Z");
    const endTime = new Date("2026-01-01T00:03:00.000Z").toISOString();

    expect(isStaleRace(endTime, now.getTime())).toBe(false);
  });

  it("returns false for an invalid end time", () => {
    expect(isStaleRace("not-a-date", Date.now())).toBe(false);
  });
});

describe("getRandomSentence", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a string from the sentences array", () => {
    const result = getRandomSentence();
    expect(sentences).toContain(result);
  });

  it("returns the first sentence when Math.random() returns 0", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(getRandomSentence()).toBe(sentences[0]);
  });

  it("returns the last sentence when Math.random() returns just below 1", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9999);
    expect(getRandomSentence()).toBe(sentences[sentences.length - 1]);
  });

  it("returns a deterministic sentence based on Math.random()", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const index = Math.floor(0.5 * sentences.length);
    expect(getRandomSentence()).toBe(sentences[index]);
  });
});

describe("calculateAccuracy", () => {
  it("returns 100 when no characters have been typed", () => {
    expect(calculateAccuracy({ charCounter: 0, mistakes: 0 })).toBe(100);
  });

  it("returns 100 when there are no mistakes", () => {
    expect(calculateAccuracy({ charCounter: 50, mistakes: 0 })).toBe(100);
  });

  it("returns 0 when all characters are mistakes", () => {
    expect(calculateAccuracy({ charCounter: 10, mistakes: 10 })).toBe(0);
  });

  it("returns the correct percentage rounded to nearest integer", () => {
    expect(calculateAccuracy({ charCounter: 100, mistakes: 10 })).toBe(90);
    expect(calculateAccuracy({ charCounter: 3, mistakes: 1 })).toBe(67);
    expect(calculateAccuracy({ charCounter: 200, mistakes: 50 })).toBe(75);
  });

  it("never returns above 100", () => {
    expect(
      calculateAccuracy({ charCounter: 10, mistakes: 0 }),
    ).toBeLessThanOrEqual(100);
  });
});

describe("getUserName", () => {
  const baseUser = {
    id: "abcdef123456",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "",
  } as User;

  it("returns display_name from user_metadata when present", () => {
    const user = {
      ...baseUser,
      user_metadata: { name: "Alice" },
    } as User;
    expect(getUserName(user)).toBe("Alice");
  });

  it("returns a fallback using the first 6 chars of user id (uppercased) when display_name is absent", () => {
    const user = {
      ...baseUser,
      user_metadata: {},
    } as User;
    expect(getUserName(user)).toBe("Player #ABCDEF");
  });

  it("returns fallback when user_metadata is undefined", () => {
    const user = {
      ...baseUser,
      user_metadata: undefined,
    } as unknown as User;
    expect(getUserName(user)).toBe("Player #ABCDEF");
  });

  it("uses exactly the first 6 characters of the id for the fallback", () => {
    const user = { ...baseUser, id: "xyz999longid", user_metadata: {} } as User;
    expect(getUserName(user)).toBe("Player #XYZ999");
  });
});

describe("getRaceScopedDisplayNames", () => {
  it("keeps unique names unchanged", () => {
    const result = getRaceScopedDisplayNames([
      { user_id: "u1", name: "Alice" },
      { user_id: "u2", name: "Bob" },
    ]);

    expect(result.get("u1")).toBe("Alice");
    expect(result.get("u2")).toBe("Bob");
  });

  it("adds #2 for the second player with same name", () => {
    const result = getRaceScopedDisplayNames([
      { user_id: "u1", name: "Player" },
      { user_id: "u2", name: "Player" },
    ]);

    expect(result.get("u1")).toBe("Player");
    expect(result.get("u2")).toBe("Player #2");
  });

  it("is deterministic and uses user_id order for duplicates", () => {
    const result = getRaceScopedDisplayNames([
      { user_id: "user-b", name: "Same" },
      { user_id: "user-a", name: "Same" },
      { user_id: "user-c", name: "Same" },
    ]);

    expect(result.get("user-a")).toBe("Same");
    expect(result.get("user-b")).toBe("Same #2");
    expect(result.get("user-c")).toBe("Same #3");
  });

  it("ignores duplicate rows for the same user", () => {
    const result = getRaceScopedDisplayNames([
      { user_id: "u1", name: "Player" },
      { user_id: "u1", name: "Player" },
      { user_id: "u2", name: "Player" },
    ]);

    expect(result.get("u1")).toBe("Player");
    expect(result.get("u2")).toBe("Player #2");
  });
});

describe("summarizeResultsForPlayers", () => {
  it("disambiguates duplicate names in final results", () => {
    const results = summarizeResultsForPlayers([
      {
        id: "r1",
        user_id: "user-a",
        name: "Player",
        round: 1,
        wpm: 50,
        accuracy: 90,
        live_progress: "FINISHED",
      },
      {
        id: "r2",
        user_id: "user-a",
        name: "Player",
        round: 2,
        wpm: 60,
        accuracy: 95,
        live_progress: "FINISHED",
      },
      {
        id: "r3",
        user_id: "user-b",
        name: "Player",
        round: 1,
        wpm: 55,
        accuracy: 91,
        live_progress: "FINISHED",
      },
      {
        id: "r4",
        user_id: "user-b",
        name: "Player",
        round: 2,
        wpm: 57,
        accuracy: 94,
        live_progress: "FINISHED",
      },
    ]);

    const resultByUserId = new Map(
      results.map((result) => [result.userId, result]),
    );

    expect(resultByUserId.get("user-a")?.name).toBe("Player");
    expect(resultByUserId.get("user-b")?.name).toBe("Player #2");
  });
});

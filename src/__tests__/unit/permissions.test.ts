import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetMocks } from "@/__tests__/mocks/mocks";

const { getUserMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  supabaseServer: {
    auth: {
      getUser: getUserMock,
    },
  },
}));

import {
  assertAuthenticatedUser,
  assertMissingConflictConstraintError,
} from "@/features/player/permissions/player";
import { playerSchema } from "@/features/player/schema/schema";
import { assertRaceEnded } from "@/features/race/permissions/race";
import { assertNoSupabaseError } from "@/lib/permissions";

describe("assertNoSupabaseError", () => {
  it("does not throw when error is null", () => {
    expect(() => assertNoSupabaseError(null)).not.toThrow();
  });

  it("throws with the Supabase error message", () => {
    expect(() => assertNoSupabaseError({ message: "Database failed" })).toThrow(
      "Database failed",
    );
  });
});

describe("assertRaceEnded", () => {
  it("throws when race has not reached the last round", () => {
    expect(() => assertRaceEnded({ round: 2 }, 6)).toThrow(
      "Race has not ended yet",
    );
  });

  it("does not throw at the ending threshold", () => {
    expect(() => assertRaceEnded({ round: 5 }, 6)).not.toThrow();
  });

  it("does not throw when race is beyond the threshold", () => {
    expect(() => assertRaceEnded({ round: 6 }, 6)).not.toThrow();
  });
});

describe("assertMissingConflictConstraintError", () => {
  it("does not throw when error is null", () => {
    expect(() => assertMissingConflictConstraintError(null)).not.toThrow();
  });

  it("does not throw for the known missing conflict constraint error", () => {
    expect(() =>
      assertMissingConflictConstraintError({
        message:
          "no unique or exclusion constraint matching the ON CONFLICT specification",
      }),
    ).not.toThrow();
  });

  it("throws for any other error", () => {
    expect(() =>
      assertMissingConflictConstraintError({ message: "Unexpected error" }),
    ).toThrow("Unexpected error");
  });
});

describe("assertAuthenticatedUser", () => {
  beforeEach(() => {
    resetMocks(getUserMock);
  });

  it("throws when user id is missing", async () => {
    await expect(assertAuthenticatedUser("", "token")).rejects.toThrow(
      "Missing user id",
    );
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("throws when access token is missing", async () => {
    await expect(assertAuthenticatedUser("user-1", "")).rejects.toThrow(
      "Unauthorized",
    );
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("throws unauthorized when Supabase auth errors", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { message: "invalid token" },
    });

    await expect(
      assertAuthenticatedUser("user-1", "bad-token"),
    ).rejects.toThrow("Unauthorized");
  });

  it("throws unauthorized when no user is returned", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(assertAuthenticatedUser("user-1", "token")).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("throws forbidden when token belongs to another user", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-2" } },
      error: null,
    });

    await expect(assertAuthenticatedUser("user-1", "token")).rejects.toThrow(
      "Forbidden",
    );
  });

  it("resolves when token user id matches input user id", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    await expect(
      assertAuthenticatedUser("user-1", "token"),
    ).resolves.toBeUndefined();
    expect(getUserMock).toHaveBeenCalledWith("token");
  });
});

describe("playerSchema", () => {
  it("accepts valid names", () => {
    const result = playerSchema.safeParse({ name: "Alice" });
    expect(result.success).toBe(true);
  });

  it("rejects names shorter than 3 characters", () => {
    const result = playerSchema.safeParse({ name: "Al" });
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Name must be at least 3 characters long",
      );
    }
  });

  it("rejects names longer than 50 characters", () => {
    const result = playerSchema.safeParse({ name: "a".repeat(51) });
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Name must be less than 50 characters long",
      );
    }
  });
});

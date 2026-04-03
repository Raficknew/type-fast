import { supabaseServer } from "@/lib/db";

const MISSING_CONFLICT_CONSTRAINT_MESSAGE =
  "no unique or exclusion constraint matching the ON CONFLICT specification";

type SupabaseErrorLike = {
  message: string;
} | null;

export const assertAuthenticatedUser = async (userId: string) => {
  if (!userId) {
    throw new Error("Missing user id");
  }

  const {
    data: { user },
    error,
  } = await supabaseServer.auth.getUser(userId);

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  if (user.id !== userId) {
    throw new Error("Forbidden");
  }
};

export const assertMissingConflictConstraintError = (
  error: SupabaseErrorLike,
) => {
  if (!error) {
    return;
  }

  const isMissingConstraintError = error.message.includes(
    MISSING_CONFLICT_CONSTRAINT_MESSAGE,
  );

  if (!isMissingConstraintError) {
    throw new Error(error.message);
  }
};

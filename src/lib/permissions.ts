import type { SupabaseErrorLike } from "@/types/types";

export const assertNoSupabaseError = (error: SupabaseErrorLike) => {
  if (error) {
    throw new Error(error.message);
  }
};

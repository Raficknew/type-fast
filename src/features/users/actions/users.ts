"use server";

import { revalidatePath } from "next/cache";
import { playerSchema } from "@/features/player/schema/schema";
import { updateUserName } from "../service/users";

export const updateUserNameAction = async (
  userId: string,
  newName: string,
): Promise<{ error?: string }> => {
  const parsed = playerSchema.safeParse({ name: newName });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (!userId) {
    return { error: "You must be signed in to change your name." };
  }

  const { error } = await updateUserName(userId, parsed.data.name);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return {};
};

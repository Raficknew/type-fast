import { supabaseServer } from "@/lib/db";

export const updateUserName = async (userId: string, newName: string) => {
  return supabaseServer.auth.admin.updateUserById(userId, {
    data: {
      name: newName,
    },
  });
};

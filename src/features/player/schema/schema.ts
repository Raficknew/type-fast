import z from "zod";

export const playerSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters long")
    .max(50, "Name must be less than 50 characters long"),
});

export type PlayerSchema = z.infer<typeof playerSchema>;

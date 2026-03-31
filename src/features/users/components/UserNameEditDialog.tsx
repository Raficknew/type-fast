"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { supabaseClient as supabase } from "@/lib/db";
import { type PlayerSchema, playerSchema } from "../../player/schema/schema";

export function UserNameEditDialog({ name }: { name?: string }) {
  const [isOpened, setIsOpened] = useState<boolean>(false);

  const form = useForm<PlayerSchema>({
    resolver: zodResolver(playerSchema),
    defaultValues: { name: name ?? "" },
  });

  async function onSubmit(data: PlayerSchema) {
    await supabase.auth.updateUser({
      data: { name: data.name },
    });
    setIsOpened(false);
  }

  return (
    <Dialog open={isOpened} onOpenChange={setIsOpened}>
      <DialogTrigger
        render={
          <button type="button">
            <HugeiconsIcon
              className="absolute right-0 top-0 cursor-pointer"
              size={10}
              icon={Edit03Icon}
            />
          </button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Nickname</DialogTitle>
        </DialogHeader>
        <form id="player-name-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="Enter new nickname"
                    autoComplete="off"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button
            type="submit"
            form="player-name-form"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

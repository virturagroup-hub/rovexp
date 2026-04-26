"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SubmitButtonProps {
  children: React.ReactNode;
  className?: string;
  name?: string;
  value?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}

export function SubmitButton({
  children,
  className,
  name,
  value,
  variant = "default",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      name={name}
      value={value}
      variant={variant}
      type="submit"
      className={cn("w-full sm:w-auto", className)}
      disabled={pending}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}

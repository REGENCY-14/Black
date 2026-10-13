"use client";

import * as RSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

/** Radix Select styled to match Input. Works with Field (id / aria props are forwarded to the trigger). */
export function Select({
  options,
  placeholder,
  className,
  onValueChange,
  value,
  disabled,
  ...aria
}: SelectProps) {
  return (
    <RSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <RSelect.Trigger
        {...aria}
        className={cn(
          "flex h-control-md w-full items-center justify-between gap-2 rounded-input border border-line bg-card px-4 text-left text-fg",
          "hover:border-line-active/50 focus-visible:border-line-active disabled:opacity-50 aria-[invalid=true]:border-danger",
          "data-[placeholder]:text-fg-faint",
          className,
        )}
      >
        <RSelect.Value placeholder={placeholder} />
        <RSelect.Icon>
          <ChevronDown className="size-5 text-fg-muted" aria-hidden />
        </RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-72 w-(--radix-select-trigger-width) overflow-hidden rounded-card border border-line bg-card text-fg shadow-float"
        >
          <RSelect.Viewport className="p-1.5">
            {options.map((o) => (
              <RSelect.Item
                key={o.value}
                value={o.value}
                className="flex min-h-hit cursor-pointer items-center justify-between gap-2 rounded-btn px-3 outline-none data-[highlighted]:bg-subtle"
              >
                <RSelect.ItemText>{o.label}</RSelect.ItemText>
                <RSelect.ItemIndicator>
                  <Check className="size-4" aria-hidden />
                </RSelect.ItemIndicator>
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
}

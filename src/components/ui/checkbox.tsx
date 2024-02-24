import type { Component } from "solid-js";
import { splitProps } from "solid-js";

import { Checkbox as CheckboxPrimitive } from "@kobalte/core";
import { IconCheck } from "@tabler/icons-solidjs";

import { cn } from "~/lib/utils";

const Checkbox: Component<CheckboxPrimitive.CheckboxRootProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  return (
    <CheckboxPrimitive.Root
      class={cn("items-top group flex space-x-2", props.class)}
      {...rest}
    >
      <CheckboxPrimitive.Input />
      <CheckboxPrimitive.Control class="peer size-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:border-none data-[checked]:bg-primary data-[checked]:text-primary-foreground">
        <CheckboxPrimitive.Indicator>
          <IconCheck class="size-4" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Control>
    </CheckboxPrimitive.Root>
  );
};

export { Checkbox };

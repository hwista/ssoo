import React from "react";
import { Card as FluentCard } from "@fluentui/react-components";

export function Card({ children, ...props }: React.ComponentProps<typeof FluentCard>) {
  return <FluentCard {...props}>{children}</FluentCard>;
}

import { Input as FluentInput } from "@fluentui/react-components";
import * as React from "react";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof FluentInput>>(
  (props, ref) => <FluentInput ref={ref} {...props} />
);
Input.displayName = "Input";

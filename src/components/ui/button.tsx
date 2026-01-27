"use client";

import React from "react";
import { Button as FluentButton } from "@fluentui/react-components";

export type ButtonVariant = "default" | "outline" | "primary" | "secondary";

export interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: ButtonVariant;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  size?: "small" | "medium" | "large";
  style?: React.CSSProperties;
  className?: string;
  type?: "button" | "submit" | "reset";
  title?: string;
}

export function Button({ variant = "default", children, className, type, title, style, onClick, size, ...props }: ButtonProps) {
  // variant에 따라 appearance를 결정
  let appearance: "primary" | "outline" | "subtle" | "transparent" = "primary";
  switch (variant) {
    case "outline":
      appearance = "outline";
      break;
    case "secondary":
      appearance = "subtle";
      break;
    case "default":
      appearance = "primary";
      break;
    case "primary":
      appearance = "primary";
      break;
    default:
      appearance = "primary";
  }
  return (
    <FluentButton
      appearance={appearance}
      className={className}
      type={type}
      title={title}
      style={style}
      onClick={onClick}
      {...props}
    >
      {children}
    </FluentButton>
  );
}

import type { ReactNode } from "react";

/** The auth pages render their own full-bleed frame. */
export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

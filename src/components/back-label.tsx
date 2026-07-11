import { ArrowLeft } from "lucide-react";

export function BackLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <ArrowLeft aria-hidden="true" size={18} />
      <span>{children}</span>
    </span>
  );
}

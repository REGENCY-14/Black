import { StoreFrame } from "@/components/layout/StoreFrame";

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return <StoreFrame>{children}</StoreFrame>;
}

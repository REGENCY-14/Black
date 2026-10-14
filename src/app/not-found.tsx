import { NotFoundState } from "@/components/layout/NotFoundState";
import { StoreFrame } from "@/components/layout/StoreFrame";

/** Root 404 (no route matched). Lives outside the store layout, so it brings its own chrome. */
export default function RootNotFound() {
  return (
    <StoreFrame>
      <NotFoundState />
    </StoreFrame>
  );
}

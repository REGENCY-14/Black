import { cacheLife } from "next/cache";

/** Current year, cached for a day so the footer can be prerendered. */
export async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

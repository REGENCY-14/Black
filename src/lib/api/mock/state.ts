/**
 * Shared, persistent state for the mock API. In the browser everything (orders, products,
 * categories, batches, staff) is saved to localStorage after each change so admin work survives a
 * reload. On the server it is just the seed. Latency only applies in the browser.
 */
import { ApiError, type Batch, type Category, type Order, type Product, type StaffUser } from "../types";
import { batches, categories, products, seedOrders, seedStaff } from "./seed";

export type StaffRecord = StaffUser & { password: string };

export interface MockState {
  orders: Order[];
  products: Product[];
  categories: Category[];
  batches: Batch[];
  staff: StaffRecord[];
}

const STORAGE_KEY = "mock-db-v2";
const SESSION_KEY = "mock-session";
export const isBrowser = typeof window !== "undefined";

export const clone = <T>(v: T): T => structuredClone(v);

let state: MockState | null = null;

function fresh(): MockState {
  return {
    orders: seedOrders(),
    products: clone(products),
    categories: clone(categories),
    batches: clone(batches),
    staff: clone(seedStaff),
  };
}

export function getState(): MockState {
  if (state) return state;
  if (isBrowser) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return (state = JSON.parse(raw) as MockState);
    } catch {
      /* fall through to seed */
    }
  }
  return (state = fresh());
}

export function save() {
  if (!isBrowser || !state) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: keep in memory only */
  }
}

/* ---------- session (stands in for a login cookie) ---------- */

let memorySession: string | null = null;

export function readSessionUserId(): string | null {
  if (!isBrowser) return memorySession;
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return memorySession;
  }
}

export function writeSessionUserId(id: string | null) {
  memorySession = id;
  if (!isBrowser) return;
  try {
    if (id) localStorage.setItem(SESSION_KEY, id);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* kept in memory */
  }
}

/* ---------- helpers ---------- */

export const delay = (min = 120, max = 380) =>
  isBrowser ? new Promise<void>((r) => setTimeout(r, min + Math.random() * (max - min))) : Promise.resolve();

/** Set NEXT_PUBLIC_MOCK_FAILURES=true to see error states during development. */
export function maybeFail() {
  if (isBrowser && !navigator.onLine) {
    throw new ApiError("network", "You are offline. Check your connection and try again.");
  }
  if (isBrowser && process.env.NEXT_PUBLIC_MOCK_FAILURES === "true" && Math.random() < 0.08) {
    throw new ApiError("network", "Something went wrong on our side. Try again in a moment.");
  }
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function randomCode(n: number) {
  let s = "";
  for (let i = 0; i < n; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

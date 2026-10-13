import { httpApi } from "./http";
import { mockApi } from "./mock";
import type { Api } from "./types";

/** Mocks are the default. Set NEXT_PUBLIC_USE_MOCKS=false (and NEXT_PUBLIC_API_URL) to use the backend. */
const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

export const api: Api = useMocks ? mockApi : httpApi;

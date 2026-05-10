// Single source of truth for the auth token
// Shared across all modules
const store = { token: null as string | null }
export const tokenStore = {
  get: () => store.token,
  set: (t: string | null) => { store.token = t },
  clear: () => { store.token = null },
}

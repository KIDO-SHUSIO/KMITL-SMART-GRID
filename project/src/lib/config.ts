// Set VITE_API_URL (e.g. http://localhost:8787) to talk to a backend API.
// If VITE_SUPABASE_URL is set or VITE_API_URL is empty, backend API mode is disabled in favour of Supabase/local mode.
export const API_URL: string = (
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_URL ? '' : 'http://localhost:8787')
).replace(/\/$/, '');

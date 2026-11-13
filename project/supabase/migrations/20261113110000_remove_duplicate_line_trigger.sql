-- K-SES: Remove duplicate database-level LINE trigger
-- The ESP32 firmware now handles LINE alerts directly with edge-trigger debouncing,
-- persistence verification (5s), recovery confirmation (10s), and 3-minute cooldown.
-- Running this prevents Supabase from firing redundant broadcast messages.

DROP TRIGGER IF EXISTS tr_notify_line_energy_waste ON rooms;
DROP FUNCTION IF EXISTS notify_line_on_energy_waste();

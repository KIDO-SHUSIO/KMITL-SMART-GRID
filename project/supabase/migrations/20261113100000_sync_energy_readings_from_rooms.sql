/*
# K-SES: Automatically record energy_readings when rooms are updated

## Overview
Whenever ESP32 or the simulator updates a room in the `rooms` table,
this trigger automatically records a historical reading in `energy_readings`.
This keeps the energy chart updated in real-time without requiring the ESP32
to make multiple HTTP requests.
*/

CREATE OR REPLACE FUNCTION record_energy_reading_on_room_update()
RETURNS trigger AS $$
BEGIN
  INSERT INTO energy_readings (room_id, building, room_number, current, power, status, ts)
  VALUES (
    NEW.id,
    NEW.building,
    NEW.room_number,
    NEW.current,
    ROUND((NEW.current * 220.0 / 1000.0)::numeric, 3),
    NEW.status,
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_record_energy_reading ON rooms;
CREATE TRIGGER tr_record_energy_reading
AFTER INSERT OR UPDATE ON rooms
FOR EACH ROW
EXECUTE FUNCTION record_energy_reading_on_room_update();


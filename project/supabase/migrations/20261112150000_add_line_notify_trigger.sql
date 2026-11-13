-- K-SES: Add LINE Messaging API notification trigger via pg_net
-- Automatically sends an alert to LINE OA when a room enters 'Energy Waste' state

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION notify_line_on_energy_waste()
RETURNS trigger AS $$
DECLARE
  line_token text := '71go7K/p6rBzjOJfIuWioeoTd7AgfXLhHJUKFh7qlFkim0NhWj0bQ60u6q5o961TvsWnFcWESBXi93V6UCqRMRx9KGau4W++dGjbCLPqerNcQnR8gTElrRKKHF42DQVsymdQJhQ0LpFfH5z6S4/9MI9PbdgDzCFqoOLOYbqAITQ=';
  msg text;
  payload jsonb;
BEGIN
  IF NEW.status = 'Energy Waste' THEN
    msg := '🚨 แจ้งเตือน: ตรวจพบ Energy Waste!' || E'\n' ||
           '━━━━━━━━━━━━━━━━━━' || E'\n' ||
           '🏢 อาคาร: ' || NEW.building || E'\n' ||
           '🚪 ห้อง: Rm ' || NEW.room_number || ' (' || NEW.zone || ')' || E'\n' ||
           '⚡ กระแส: ' || NEW.current || ' A' || E'\n' ||
           '👤 คนในห้อง: ' || (CASE WHEN NEW.motion THEN 'ตรวจพบความเคลื่อนไหว' ELSE 'ไม่มีคนอยู่' END) || E'\n' ||
           '━━━━━━━━━━━━━━━━━━' || E'\n' ||
           '🕒 เวลา: ' || to_char(now() AT TIME ZONE 'Asia/Bangkok', 'HH24:MI:SS');

    payload := jsonb_build_object(
      'messages', jsonb_build_array(
        jsonb_build_object('type', 'text', 'text', msg)
      )
    );

    PERFORM net.http_post(
      url := 'https://api.line.me/v2/bot/message/broadcast',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || line_token
      ),
      body := payload
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_line_energy_waste ON rooms;
CREATE TRIGGER tr_notify_line_energy_waste
AFTER INSERT OR UPDATE ON rooms
FOR EACH ROW
EXECUTE FUNCTION notify_line_on_energy_waste();

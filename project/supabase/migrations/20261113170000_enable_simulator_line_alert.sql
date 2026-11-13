-- K-SES: LINE Messaging API trigger สำหรับระบบ Simulator บนหน้าเว็บ (zone = 'Simulated')
-- ทำงานผ่าน pg_net ส่งเข้า LINE อัตโนมัติเมื่อกดจำลอง Energy Waste บนหน้าเว็บ
-- มีระบบป้องกันการแจ้งเตือนซ้ำ:
-- 1) ทำงานเฉพาะ zone = 'Simulated' (ไม่ชนกับบอร์ด ESP32 จริง ไม่เบิ้ล 2 รอบแน่นอน)
-- 2) ยิงเฉพาะจังหวะที่สถานะเปลี่ยนเป็น Energy Waste ครั้งแรก (Edge-triggered)

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION notify_line_on_simulated_waste()
RETURNS trigger AS $$
DECLARE
  line_token text := '71go7K/p6rBzjOJfIuWioeoTd7AgfXLhHJUKFh7qlFkim0NhWj0bQ60u6q5o961TvsWnFcWESBXi93V6UCqRMRx9KGau4W++dGjbCLPqerNcQnR8gTElrRKKHF42DQVsymdQJhQ0LpFfH5z6S4/9MI9PbdgDzCFqoOLOYbqAITQ=';
  msg text;
  payload jsonb;
BEGIN
  IF NEW.status = 'Energy Waste' 
     AND (OLD.status IS DISTINCT FROM 'Energy Waste') 
     AND NEW.zone = 'Simulated' THEN
     
    msg := '🚨 [Simulator] ตรวจพบ Energy Waste!' || E'\n' ||
           '━━━━━━━━━━━━━━━━━━' || E'\n' ||
           '🏢 อาคาร: ' || NEW.building || E'\n' ||
           '🚪 ห้อง: Rm ' || NEW.room_number || E'\n' ||
           '⚡ กระแส: ' || NEW.current || ' A' || E'\n' ||
           '👤 คนในห้อง: ' || (CASE WHEN NEW.motion THEN 'ตรวจพบคน' ELSE 'ไม่มีคนอยู่' END) || E'\n' ||
           '━━━━━━━━━━━━━━━━━━' || E'\n' ||
           'ระบบ: K-SES Web Simulator';

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

DROP TRIGGER IF EXISTS tr_notify_line_simulated_waste ON rooms;
CREATE TRIGGER tr_notify_line_simulated_waste
AFTER INSERT OR UPDATE ON rooms
FOR EACH ROW
EXECUTE FUNCTION notify_line_on_simulated_waste();

-- Add unique constraint to minute_attendance to allow upserts
ALTER TABLE minute_attendance
ADD CONSTRAINT minute_attendance_minute_participant_unique UNIQUE (minute_id, participant_id);

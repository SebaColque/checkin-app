-- Enable realtime for the attendees table
-- Run this in your Supabase SQL Editor

-- First, make sure realtime is enabled for the attendees table
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendees;

-- Enable row level security if not already enabled
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on attendees" ON public.attendees
FOR ALL USING (true) WITH CHECK (true);

-- Optional: Create indexes for better performance on realtime queries
CREATE INDEX IF NOT EXISTS idx_attendees_checked_in_at ON public.attendees(checked_in_at);
CREATE INDEX IF NOT EXISTS idx_attendees_station ON public.attendees(station);
CREATE INDEX IF NOT EXISTS idx_attendees_full_name ON public.attendees(full_name);

-- Verify the publication includes our table
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'attendees';

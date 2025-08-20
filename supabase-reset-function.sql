-- Function to reset the check-in system
-- This function should be created in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION reset_checkin_system()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reset the ticket sequence to start from 1
  ALTER SEQUENCE public.ticket_seq RESTART WITH 1;
  
  -- Delete ALL records from attendees table
  DELETE FROM public.attendees;
  
  -- Optional: You can also add logging here if needed
  -- INSERT INTO public.system_logs (action, timestamp) 
  -- VALUES ('SYSTEM_RESET', NOW());
  
END;
$$;

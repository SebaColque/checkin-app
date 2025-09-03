import { useEffect, useRef } from 'react';
import { supabase, Attendee } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeProps {
  onAttendeesUpdate: (attendees: Attendee[]) => void;
  onAttendeeInsert: (attendee: Attendee) => void;
  onAttendeeUpdate: (attendee: Attendee) => void;
  onAttendeeDelete: (id: string) => void;
}

export function useRealtime({
  onAttendeesUpdate,
  onAttendeeInsert,
  onAttendeeUpdate,
  onAttendeeDelete
}: UseRealtimeProps) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Create realtime subscription
    const channel = supabase
      .channel('attendees-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendees'
        },
        (payload) => {
        //   console.log('Realtime INSERT:', payload);
          onAttendeeInsert(payload.new as Attendee);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'attendees'
        },
        (payload) => {
        //   console.log('Realtime UPDATE:', payload);
          onAttendeeUpdate(payload.new as Attendee);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'attendees'
        },
        (payload) => {
        //   console.log('Realtime DELETE:', payload);
          onAttendeeDelete(payload.old.id);
        }
      )
      .subscribe((status) => {
        // console.log('Realtime subscription status:', status);
      });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [onAttendeesUpdate, onAttendeeInsert, onAttendeeUpdate, onAttendeeDelete]);

  // Function to manually refresh all data
  const refreshAllData = async () => {
    try {
      const { data, error } = await supabase
        .from('attendees')
        .select('id, full_name, company, email, phone, checked_in_at, ticket_no, station')
        .order('full_name');

      if (error) {
        console.error('Error refreshing data:', error);
        return;
      }

      onAttendeesUpdate(data || []);
    } catch (error) {
      console.error('Error in refreshAllData:', error);
    }
  };

  return {
    refreshAllData,
    isConnected: channelRef.current?.state === 'joined'
  };
}

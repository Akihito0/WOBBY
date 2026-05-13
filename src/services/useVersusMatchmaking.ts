import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface OpponentData {
  id: string;
  username: string;
  avatar_url?: string;
  xp?: number;
}

export interface MatchState {
  status: 'idle' | 'searching' | 'found' | 'waiting_for_acceptance' | 'both_accepted' | 'error';
  opponent?: OpponentData;
  matchId?: string;
  targetDistance?: number;
  userAccepted?: boolean;
  opponentAccepted?: boolean;
  error?: string;
}

/**
 * Custom hook for versus matchmaking using RPC and Realtime listeners
 * With fallback polling if realtime doesn't work
 */
export const useVersusMatchmaking = () => {
  const [matchState, setMatchState] = useState<MatchState>({ status: 'idle' });
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const matchFoundRef = useRef(false);
  const acceptancePollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Start the matchmaking process with target distance
   * - Call the RPC function find_or_join_match(target_distance)
   * - If waiting: set up realtime listener AND fallback polling
   * - If matched: fetch opponent data and resolve immediately
   */
  const startMatchmaking = useCallback(async (targetDistance: 1 | 3 | 5 = 1) => {
    try {
      console.log(`🚀 [Matchmaking] Starting matchmaking process for ${targetDistance}km...`);
      setMatchState({ status: 'searching' });

      // Get current user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user?.id) {
        throw new Error('Could not authenticate user');
      }

      const userId = session.user.id;
      console.log(`👤 [Matchmaking] Current user ID: ${userId}`);
      
      currentUserIdRef.current = userId;
      matchFoundRef.current = false;

      // Call the RPC function with target distance
      console.log(`📞 [Matchmaking] Calling find_or_join_match(${targetDistance}) RPC...`);
      const { data, error } = await supabase.rpc('find_or_join_match', { target_dist: targetDistance });

      if (error) {
        throw new Error(error.message || 'Matchmaking failed');
      }

      console.log('📝 [Matchmaking] RPC response:', data);

      if (data.status === 'already_waiting') {
        throw new Error('You are already in the queue. Please wait or cancel first.');
      }

      if (data.status === 'waiting') {
        console.log('⏳ [Matchmaking] Status is WAITING - setting up listener and polling');
        // User is now waiting - set up realtime listener AND polling fallback
        setupRealtimeListener(userId);
        startPollingFallback(userId);

        // Timeout after 5 minutes
        timeoutRef.current = setTimeout(() => {
          console.log('⏱️ [Matchmaking] 5-minute timeout reached');
          cancelMatchmaking();
          setMatchState({
            status: 'error',
            error: 'Matchmaking timeout. No opponent found.',
          });
        }, 5 * 60 * 1000);
      } else if (data.status === 'matched') {
        console.log('🎉 [Matchmaking] Status is MATCHED - immediate match found!');
        // Immediate match! Fetch opponent data
        await fetchAndSetOpponent(data.opponent_id, data.match_id, data.target_distance);
      } else {
        console.warn('⚠️ [Matchmaking] Unknown status:', data.status);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ [Matchmaking] Error:', errorMessage);
      setMatchState({ status: 'error', error: errorMessage });
    }
  }, []);

  /**
   * Set up realtime listener to detect when the user is matched
   */
  const setupRealtimeListener = (userId: string) => {
    // Clean up any existing channel
    if (realtimeChannelRef.current) {
      console.log(`🧹 [Realtime] Cleaning up old channel for user ${userId}`);
      realtimeChannelRef.current.unsubscribe();
      realtimeChannelRef.current = null;
    }

    console.log(`📡 [Realtime] Setting up listener for user ${userId}`);

    // Create a new channel for this user's matchmaking record
    const channel = supabase.channel(`versus_run_matchmaking:${userId}`, {
      config: {
        broadcast: { self: true },
      },
    });

    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'versus_run_matchmaking',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log(`📨 [Realtime] Received update for user ${userId}:`, payload);
          const updated = payload.new as any;

          // Check if status changed to matched
          if (updated.status === 'matched' && updated.opponent_id && updated.match_id) {
            if (matchFoundRef.current) {
              console.log('⏭️ [Realtime] Already processing match, skipping duplicate');
              return; // Prevent duplicate processing
            }
            matchFoundRef.current = true;

            console.log('✅ [Realtime] Match found for user:', userId, 'with opponent:', updated.opponent_id);

            // Clear timeout and polling
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }

            // Fetch opponent data and update state
            await fetchAndSetOpponent(updated.opponent_id, updated.match_id, updated.target_distance);
          } else {
            console.log(`ℹ️ [Realtime] Update received but status not matched yet:`, updated.status);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ [Realtime] Successfully subscribed for user ${userId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.warn(`⚠️ [Realtime] Channel error, relying on polling for user ${userId}`);
        } else if (status === 'CLOSED') {
          console.warn(`⚠️ [Realtime] Channel closed for user ${userId}`);
        } else {
          console.log(`📡 [Realtime] Channel status changed to: ${status} for user ${userId}`);
        }
      });

    realtimeChannelRef.current = channel;
  };

  /**
   * Polling fallback - check the database every second if realtime doesn't work
   * This ensures User A eventually sees the match even if realtime fails
   */
  const startPollingFallback = (userId: string) => {
    console.log(`🔄 [Polling] Starting polling fallback for user ${userId}`);
    
    pollingRef.current = setInterval(async () => {
      if (matchFoundRef.current) {
        console.log('🛑 [Polling] Already found match, stopping polling');
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        return;
      }

      try {
        console.log(`🔍 [Polling] Checking for match for user ${userId}...`);
        
        // Query without using maybeSingle() - use select() and filter the results
        // This handles RLS and multiple rows cases
        const { data, error } = await supabase
          .from('versus_run_matchmaking')
          .select('status, opponent_id, match_id, target_distance')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.log(`⚠️ [Polling] Query error: ${error.message}`);
          return;
        }

        if (!data || data.length === 0) {
          console.log(`⏳ [Polling] No record found for user yet (might still be waiting)`);
          return;
        }

        const record = data[0];
        console.log(`📊 [Polling] Record found for user ${userId}:`, record);

        // Now check if status is matched
        if (record.status === 'matched' && record.opponent_id && record.match_id) {
          matchFoundRef.current = true;
          console.log('✅ [Polling] Match found for user:', userId, 'with opponent:', record.opponent_id);

          // Clear timeout and polling
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          // Fetch opponent data and update state
          await fetchAndSetOpponent(record.opponent_id, record.match_id, record.target_distance);
        } else {
          console.log(`ℹ️ [Polling] Record exists but status is: ${record.status}. Waiting for it to change to 'matched'...`);
        }
      } catch (err) {
        console.error('❌ [Polling] Error during polling:', err);
      }
    }, 1000); // Poll every 1 second
  };

  /**
   * Fetch opponent profile data and set match state
   */
  const fetchAndSetOpponent = async (opponentId: string, matchId: string, targetDistance: number) => {
    try {
      console.log(`👥 [Opponent] Fetching opponent profile for ID: ${opponentId}`);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, xp')
        .eq('id', opponentId)
        .single();

      if (error) {
        console.error('❌ [Opponent] Error fetching profile:', error);
        throw error;
      }

      console.log(`✅ [Opponent] Successfully fetched opponent: ${profile?.username}`);

      setMatchState({
        status: 'found',
        opponent: profile,
        matchId,
        targetDistance,
      });

      console.log('🎯 [Opponent] Match state updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch opponent data';
      console.error('❌ [Opponent] Error:', errorMessage);
      setMatchState({ status: 'error', error: errorMessage });
    }
  };

  /**
   * Listen for opponent acceptance
   */
  const setupAcceptanceListener = useCallback(async () => {
    console.log(`📡 [AcceptanceListener] Setting up listener for acceptance updates...`);
    
    // Use opponent ID from matchState (we already have it)
    if (!matchState.opponent?.id) {
      console.error('❌ [AcceptanceListener] No opponent ID found in matchState');
      return;
    }

    const opponentId = matchState.opponent.id;
    console.log(`👀 [AcceptanceListener] Watching opponent ${opponentId} for acceptance...`);

    // Create channel to listen for opponent's acceptance
    const channel = supabase.channel(`acceptance:${matchState.matchId}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'versus_run_matchmaking',
          filter: `user_id=eq.${opponentId}`,
        },
        async (payload) => {
          const updated = payload.new as any;
          console.log(`📊 [AcceptanceListener] Opponent update:`, updated);

          // Check if opponent has accepted
          if (updated.user_accepted === true) {
            console.log('🎉 [AcceptanceListener] Both users accepted! Ready to start versus match');
            
            // Clean up listeners
            channel.unsubscribe();
            if (acceptancePollingRef.current) {
              clearInterval(acceptancePollingRef.current);
              acceptancePollingRef.current = null;
            }

            // Update state to indicate both have accepted
            setMatchState(prev => ({
              ...prev,
              status: 'both_accepted',
              opponentAccepted: true,
            }));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ [AcceptanceListener] Listening for opponent acceptance`);
        }
      });

    // Add polling fallback to check opponent acceptance every 500ms
    console.log(`🔄 [AcceptanceListener] Starting polling fallback for opponent acceptance`);
    acceptancePollingRef.current = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('versus_run_matchmaking')
          .select('user_accepted')
          .eq('user_id', opponentId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.log(`⚠️ [AcceptanceListener Polling] Query error: ${error.message}`);
          return;
        }

        if (!data || data.length === 0) {
          console.log(`⚠️ [AcceptanceListener Polling] No data found for opponent ${opponentId}`);
          return;
        }

        const record = data[0];
        console.log(`🔍 [AcceptanceListener Polling] Opponent record:`, record);

        if (record.user_accepted === true) {
          console.log('🎉 [AcceptanceListener Polling] Both users accepted! Ready to start versus match');
          
          // Clean up polling and realtime
          if (acceptancePollingRef.current) {
            clearInterval(acceptancePollingRef.current);
            acceptancePollingRef.current = null;
          }
          channel.unsubscribe();

          // Update state to indicate both have accepted
          setMatchState(prev => ({
            ...prev,
            status: 'both_accepted',
            opponentAccepted: true,
          }));
        }
      } catch (err) {
        console.error('❌ [AcceptanceListener Polling] Error:', err);
      }
    }, 500); // Poll every 500ms
  }, [matchState.opponent?.id, matchState.matchId]);

  /**
   * Mark current user as accepted and watch for opponent acceptance
   */
  const acceptMatch = useCallback(async () => {
    if (!currentUserIdRef.current || !matchState.matchId) {
      console.error('❌ [Accept] Missing user ID or match ID');
      return;
    }

    try {
      console.log('👍 [Accept] User accepting match...');
      
      // Update current user's acceptance status
      const { error: updateError } = await supabase
        .from('versus_run_matchmaking')
        .update({ user_accepted: true })
        .eq('user_id', currentUserIdRef.current);

      if (updateError) {
        throw updateError;
      }

      console.log('✅ [Accept] User marked as accepted, waiting for opponent...');
      
      // Update local state to show user accepted
      setMatchState(prev => ({
        ...prev,
        status: 'waiting_for_acceptance',
        userAccepted: true,
      }));

      // Set up listener for opponent acceptance
      await setupAcceptanceListener();
    } catch (err) {
      console.error('❌ [Accept] Error accepting match:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept match';
      setMatchState({ status: 'error', error: errorMessage });
    }
  }, [matchState.matchId, setupAcceptanceListener]);

  /**
   * Cancel matchmaking and clean up
   */
  const cancelMatchmaking = useCallback(async () => {
    try {
      console.log('🛑 [Cancel] Canceling matchmaking...');
      
      // Clean up realtime listener
      if (realtimeChannelRef.current) {
        console.log('🧹 [Cancel] Unsubscribing realtime channel');
        realtimeChannelRef.current.unsubscribe();
        realtimeChannelRef.current = null;
      }

      // Clean up polling
      if (pollingRef.current) {
        console.log('🧹 [Cancel] Clearing polling interval');
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      // Clean up acceptance polling
      if (acceptancePollingRef.current) {
        console.log('🧹 [Cancel] Clearing acceptance polling interval');
        clearInterval(acceptancePollingRef.current);
        acceptancePollingRef.current = null;
      }

      // Clean up timeout
      if (timeoutRef.current) {
        console.log('🧹 [Cancel] Clearing timeout');
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Delete waiting record from database
      let userIdToDelete = currentUserIdRef.current;
      if (!userIdToDelete) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          userIdToDelete = session.user.id;
        }
      }

      if (userIdToDelete) {
        console.log(`🗑️ [Cancel] Deleting WAITING record for user ${userIdToDelete}`);
        // IMPORTANT: Only delete records that are still 'waiting'.
        // Do NOT delete 'matched' records — they are referenced by versus_run_results
        // and deleting them would CASCADE-delete the run results, breaking Challenge History.
        const { error } = await supabase
          .from('versus_run_matchmaking')
          .delete()
          .eq('user_id', userIdToDelete)
          .eq('status', 'waiting');

        if (error) {
          console.error('❌ [Cancel] Error cleaning up matchmaking:', error);
        } else {
          console.log('✅ [Cancel] Waiting record deleted successfully');
        }
      }

      setMatchState({ status: 'idle' });
      matchFoundRef.current = false;
      console.log('✅ [Cancel] Matchmaking canceled and cleaned up');
    } catch (err) {
      console.error('❌ [Cancel] Error canceling matchmaking:', err);
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cancelMatchmaking();
    };
  }, [cancelMatchmaking]);

  return {
    matchState,
    startMatchmaking,
    cancelMatchmaking,
    acceptMatch,
  };
};

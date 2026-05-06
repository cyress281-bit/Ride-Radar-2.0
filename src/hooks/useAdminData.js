import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * @typedef {Object} AdminQueryResult
 * @property {Array} data - The fetched data array
 * @property {boolean} isLoading - Whether the query is loading
 * @property {boolean} isError - Whether an error occurred
 * @property {Error|null} error - The error object if any
 * @property {Function} refetch - Manual refetch trigger
 */

/**
 * Shared hook for fetching common admin data across all admin pages.
 *
 * Architecture:
 * - Each dataset is a separate react-query with its own cache key
 * - 60s stale time balances freshness with performance
 * - Admin queries bypass RLS via service-role or admin-specific policies
 * - Data is returned in snake_case (Supabase convention)
 *
 * RLS Policy Requirements:
 * - Users with role='admin' need SELECT access to all tables queried here
 * - Recommended: create a Postgres policy like:
 *   `CREATE POLICY admin_read ON <table> FOR SELECT USING (
 *     EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
 *   );`
 *
 * @returns {{
 *   users: AdminQueryResult,
 *   broadcasts: AdminQueryResult,
 *   profiles: AdminQueryResult,
 *   reports: AdminQueryResult,
 *   notifications: AdminQueryResult,
 *   blocks: AdminQueryResult,
 *   deletionRequests: AdminQueryResult,
 *   conversations: AdminQueryResult,
 *   isLoading: boolean
 * }}
 */
export function useAdminData() {
  const users = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  const broadcasts = useQuery({
    queryKey: ['admin-broadcasts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  const profiles = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  const reports = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  const notifications = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  const blocks = useQuery({
    queryKey: ['admin-blocks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  const deletionRequests = useQuery({
    queryKey: ['admin-deletion-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_deletion_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  const conversations = useQuery({
    queryKey: ['admin-conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  return {
    users,
    broadcasts,
    profiles,
    reports,
    notifications,
    blocks,
    deletionRequests,
    conversations,
    isLoading: users.isLoading || broadcasts.isLoading || profiles.isLoading,
  };
}

/**
 * Targeted hook for admin report mutations.
 * Provides Supabase-based update and delete operations for moderation.
 */
export function useAdminMutations() {
  return {
    /**
     * Update a report's status and details
     * @param {string} id - Report ID
     * @param {Object} updates - Fields to update
     */
    updateReport: async (id, updates) => {
      const { error } = await supabase
        .from('reports')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },

    /**
     * Delete a broadcast by ID
     * @param {string} id - Broadcast ID
     */
    deleteBroadcast: async (id) => {
      const { error } = await supabase
        .from('broadcasts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },

    /**
     * Update a broadcast's status
     * @param {string} id - Broadcast ID
     * @param {Object} updates - Fields to update
     */
    updateBroadcast: async (id, updates) => {
      const { error } = await supabase
        .from('broadcasts')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },

    /**
     * Update a user's role
     * @param {string} id - User ID
     * @param {string} role - New role value
     */
    updateUserRole: async (id, role) => {
      const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', id);
      if (error) throw error;
    },

    /**
     * Update a user profile (e.g., make private)
     * @param {string} id - Profile ID
     * @param {Object} updates - Fields to update
     */
    updateProfile: async (id, updates) => {
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },

    /**
     * Archive a conversation
     * @param {string} id - Conversation ID
     */
    archiveConversation: async (id) => {
      const { error } = await supabase
        .from('conversations')
        .update({ status: 'archived' })
        .eq('id', id);
      if (error) throw error;
    },

    /**
     * Delete a message by ID
     * @param {string} id - Message ID
     */
    deleteMessage: async (id) => {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },

    /**
     * Send an announcement notification to all users.
     * Uses a Supabase Edge Function or inserts notifications per-user.
     * @param {Object} params - { title, body }
     */
    sendAnnouncement: async ({ title, body }) => {
      // Attempt to use Edge Function first
      const { error: fnError } = await supabase.functions.invoke('send-announcement', {
        body: { title, body, type: 'announcement', send_to_all: true },
      });

      if (fnError) {
        // Fallback: insert a broadcast notification record
        logger.warn('[Admin] Edge function unavailable, inserting notification directly');
        const { error } = await supabase
          .from('notifications')
          .insert({
            type: 'announcement',
            title,
            body,
            is_global: true,
          });
        if (error) throw error;
      }
    },
  };
}

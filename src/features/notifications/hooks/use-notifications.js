/**
 * Notification query hooks using TanStack Query v5 with real-time subscriptions.
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase.js';
import { normalizeNotification } from '@/lib/notificationNormalizer.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '@/features/notifications/api/notifications-api.js';
import { toast } from '@/components/ui/use-toast';

/**
 * Query key factory for notifications.
 */
export const notificationKeys = {
  all: ['notifications'],
  lists: () => [...notificationKeys.all, 'list'],
  list: (userId) => [...notificationKeys.lists(), userId],
  unread: (userId) => [...notificationKeys.all, 'unread', userId],
};

/**
 * Hook to fetch notifications for the current user with real-time updates.
 *
 * @param {string|null} userId
 */
export function useNotifications(userId) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: notificationKeys.list(userId),
    queryFn: async () => {
      const { data, error } = await getNotifications(userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          qc.setQueryData(notificationKeys.list(userId), (old = []) => {
            const next = normalizeNotification(payload.new);
            if (!next || old.some((n) => n.id === next.id)) return old;
            return [next, ...old];
          });
          // Also invalidate unread count
          qc.invalidateQueries({ queryKey: notificationKeys.unread(userId) });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          qc.setQueryData(notificationKeys.list(userId), (old = []) =>
            old.map((n) =>
              n.id === payload.new.id ? normalizeNotification(payload.new) : n
            )
          );
          qc.invalidateQueries({ queryKey: notificationKeys.unread(userId) });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          qc.setQueryData(notificationKeys.list(userId), (old = []) =>
            old.filter((n) => n.id !== payload.old.id)
          );
          qc.invalidateQueries({ queryKey: notificationKeys.unread(userId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  return query;
}

/**
 * Hook to fetch the unread notification count with real-time updates.
 *
 * @param {string|null} userId
 */
export function useUnreadCount(userId) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: notificationKeys.unread(userId),
    queryFn: async () => {
      const { data, error } = await getUnreadCount(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // Re-sync unread count on real-time events
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-unread-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: notificationKeys.unread(userId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  return query;
}

/**
 * Mutation hook to mark a single notification as read.
 */
export function useMarkAsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId) => {
      const { data, error } = await markAsRead(notificationId);
      if (error) throw error;
      return data;
    },
    onMutate: async (notificationId) => {
      const queryKey = notificationKeys.all;
      await qc.cancelQueries({ queryKey });

      const previousLists = qc.getQueriesData({ queryKey });

      qc.setQueriesData({ queryKey }, (old = []) => {
        if (!Array.isArray(old)) return old;
        return old.map((n) =>
          n.id === notificationId ? { ...n, is_read: true, isRead: true } : n
        );
      });

      return { previousLists };
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          qc.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Mutation hook to mark all notifications as read for a user.
 */
export function useMarkAllAsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (userId) => {
      const { data, error } = await markAllAsRead(userId);
      if (error) throw error;
      return data;
    },
    onMutate: async (userId) => {
      const listKey = notificationKeys.list(userId);
      const unreadKey = notificationKeys.unread(userId);
      await qc.cancelQueries({ queryKey: listKey });
      const previousList = qc.getQueryData(listKey);
      const previousUnread = qc.getQueryData(unreadKey);

      qc.setQueryData(listKey, (old = []) =>
        old.map((n) => ({ ...n, is_read: true, isRead: true }))
      );
      qc.setQueryData(unreadKey, () => 0);

      return { previousList, previousUnread, listKey, unreadKey };
    },
    onError: (_error, _userId, context) => {
      if (context?.previousList) {
        qc.setQueryData(context.listKey, context.previousList);
      }
      if (context?.previousUnread !== undefined) {
        qc.setQueryData(context.unreadKey, context.previousUnread);
      }
    },
    onSettled: (_data, _error, userId) => {
      qc.invalidateQueries({ queryKey: notificationKeys.list(userId) });
      qc.invalidateQueries({ queryKey: notificationKeys.unread(userId) });
    },
  });
}

/**
 * Mutation hook to delete a notification.
 */
export function useDeleteNotification() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId) => {
      const { data, error } = await deleteNotification(notificationId);
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, _notificationId) => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete notification',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}

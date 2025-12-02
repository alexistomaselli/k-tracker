import { useState, useEffect, useCallback } from 'react';
import { getSupabase, SUPABASE_CONFIGURED } from '../lib/supabase';
import { useCurrentUser } from './useData';

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'task_assigned' | 'mention' | 'reminder' | 'info';
    read: boolean;
    link?: string;
    created_at: string;
}

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const { participant } = useCurrentUser();

    const fetchNotifications = useCallback(async () => {
        if (!SUPABASE_CONFIGURED || !participant) return;
        const supabase = getSupabase()!;

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', participant.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching notifications:', error);
        } else {
            setNotifications(data || []);
            setUnreadCount(data?.filter(n => !n.read).length || 0);
        }
        setLoading(false);
    }, [participant]);

    const markAsRead = async (id: string) => {
        if (!SUPABASE_CONFIGURED) return;
        const supabase = getSupabase()!;

        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id);
    };

    const markAllAsRead = async () => {
        if (!SUPABASE_CONFIGURED || !participant) return;
        const supabase = getSupabase()!;

        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);

        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', participant.id)
            .eq('read', false);
    };

    useEffect(() => {
        fetchNotifications();

        if (SUPABASE_CONFIGURED && participant) {
            const supabase = getSupabase()!;
            const subscription = supabase
                .channel('notifications_changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${participant.id}`
                }, (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newNotification = payload.new as Notification;
                        setNotifications(prev => [newNotification, ...prev]);
                        setUnreadCount(prev => prev + 1);
                        // Optional: Play sound or show toast
                    } else if (payload.eventType === 'UPDATE') {
                        setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new as Notification : n));
                        // Re-calc unread count might be needed if read status changed remotely, but usually local action triggers it.
                        // For simplicity, we can refetch or just update.
                        // Let's just update the item.
                    }
                })
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [participant, fetchNotifications]);

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        reloadNotifications: fetchNotifications
    };
}

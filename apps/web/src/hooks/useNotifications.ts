'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { FirestoreNotification } from '@/lib/types/firestore';

export interface Notification extends FirestoreNotification {
  id: string;
}

export function useNotifications() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Real-time subscription to user notifications
    const notifsRef = collection(db, 'users', currentUser.uid, 'notifications');
    const q = query(notifsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Notification[];

        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.seen).length);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error in notifications subscription:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    if (!currentUser?.uid) return;

    try {
      const notifRef = doc(db, 'users', currentUser.uid, 'notifications', notificationId);
      await updateDoc(notifRef, { seen: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!currentUser?.uid) return;

    try {
      const batch = writeBatch(db);
      const unreadNotifs = notifications.filter(n => !n.seen);

      unreadNotifs.forEach(notif => {
        const notifRef = doc(db, 'users', currentUser.uid, 'notifications', notif.id);
        batch.update(notifRef, { seen: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  };
}


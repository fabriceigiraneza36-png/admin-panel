// admin/src/context/NotificationContext.jsx
import React, {
  createContext, useContext, useCallback,
  useEffect, useRef, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addNotification, markRead, markAllRead,
  removeNotification, clearAll, togglePanel, closePanel,
  selectNotifications, selectUnreadCount, selectPanelOpen,
} from '@store/notificationsSlice';
import { NOTIFICATION_TYPES } from '@utils/constants';
import notificationsAPI        from '@api/notifications';
import { useSocket }           from '@hooks/useSocket';

const NotificationContext = createContext(null);
const POLL_MS = 60_000;

export function NotificationProvider({ children }) {
  const dispatch = useDispatch();
  const socket   = useSocket?.();

  const items       = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const panelOpen   = useSelector(selectPanelOpen);

  const [serverNotifs,  setServerNotifs]  = useState([]);
  const [serverStats,   setServerStats]   = useState({});
  const [serverLoading, setServerLoading] = useState(false);
  const [serverPage,    setServerPage]    = useState(1);
  const [serverTotal,   setServerTotal]   = useState(0);
  const [serverPages,   setServerPages]   = useState(1);
  const [targetGroups,  setTargetGroups]  = useState([]);

  const pollRef    = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Fetch server notifications ─────────────────────────────────────────────

  const fetchServerNotifs = useCallback(async (pageNum = 1, silent = false) => {
    if (!silent) setServerLoading(true);
    try {
      const [data, statsData, groupsData] = await Promise.all([
        notificationsAPI.getAll({ page: pageNum, limit: 30 }),
        notificationsAPI.getStats(),
        notificationsAPI.getTargetGroups?.() || Promise.resolve({ groups: [] }),
      ]);
      if (!mountedRef.current) return;
      setServerNotifs(prev =>
        pageNum === 1 ? (data.data || []) : [...prev, ...(data.data || [])],
      );
      setServerStats(statsData.data  || {});
      setTargetGroups(groupsData.groups || []);
      setServerTotal(data.pagination?.total       || 0);
      setServerPages(data.pagination?.total_pages || 1);
      setServerPage(pageNum);

      const serverUnread = parseInt(statsData.data?.unread || 0, 10);
      if (serverUnread > 0) {
        dispatch({ type: 'notifications/syncUnread', payload: serverUnread });
      }
    } catch (err) {
      console.warn('[NotificationContext] fetch failed:', err.message);
    } finally {
      if (mountedRef.current) setServerLoading(false);
    }
  }, [dispatch]);

  useEffect(() => { fetchServerNotifs(1); }, [fetchServerNotifs]);

  useEffect(() => {
    pollRef.current = setInterval(() => fetchServerNotifs(1, true), POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchServerNotifs]);

  // ── Socket ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const onNew = (notif) => {
      if (!mountedRef.current) return;
      setServerNotifs(prev => {
        if (prev.some(n => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
      setServerTotal(t => t + 1);
      dispatch(addNotification({
        type:    mapTypeToRedux(notif.type),
        title:   notif.title,
        message: notif.message,
        data:    notif,
      }));
    };

    const onUpdated = (notif) => {
      if (!mountedRef.current) return;
      setServerNotifs(prev =>
        prev.map(n => n.id === notif.id ? { ...n, ...notif } : n),
      );
    };

    const onUserReplied = ({ notificationId, replyText, userName }) => {
      if (!mountedRef.current) return;
      setServerNotifs(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, reply_text: replyText, replyText, replierName: userName }
            : n,
        ),
      );
      // Toast for admin
      dispatch(addNotification({
        type:    NOTIFICATION_TYPES.MESSAGE || 'message',
        title:   `💬 ${userName || 'User'} replied`,
        message: replyText?.slice(0, 80),
        data:    { notificationId },
      }));
    };

    const onBroadcastSent = ({ count, title }) => {
      if (!mountedRef.current) return;
      fetchServerNotifs(1, true);
      dispatch(addNotification({
        type:    NOTIFICATION_TYPES.INFO || 'info',
        title:   '📢 Broadcast sent',
        message: `"${title}" delivered to ${count} users`,
      }));
    };

    socket.on('notification:new',            onNew);
    socket.on('notification:updated',        onUpdated);
    socket.on('notification:user-replied',   onUserReplied);
    socket.on('notification:broadcast-sent', onBroadcastSent);

    return () => {
      socket.off('notification:new',            onNew);
      socket.off('notification:updated',        onUpdated);
      socket.off('notification:user-replied',   onUserReplied);
      socket.off('notification:broadcast-sent', onBroadcastSent);
    };
  }, [socket, dispatch, fetchServerNotifs]);

  // ── UI toast helpers ───────────────────────────────────────────────────────

  const notify = useCallback(
    (type, title, message, data) =>
      dispatch(addNotification({ type, title, message, data })),
    [dispatch],
  );

  const notifyBooking = useCallback(
    (msg, data) => notify(NOTIFICATION_TYPES.BOOKING, 'New Booking', msg, data),
    [notify],
  );
  const notifyMessage = useCallback(
    (msg, data) => notify(NOTIFICATION_TYPES.MESSAGE, 'New Message', msg, data),
    [notify],
  );
  const notifyChat = useCallback(
    (msg, data) => notify(NOTIFICATION_TYPES.CHAT, 'Live Chat', msg, data),
    [notify],
  );

  // ── Server actions ─────────────────────────────────────────────────────────

  const sendNotification = useCallback(async (payload) => {
    const result = await notificationsAPI.create(payload);
    fetchServerNotifs(1, true);
    return result;
  }, [fetchServerNotifs]);

  const sendAdminReply = useCallback(async (notifId, adminReply) => {
    const result = await notificationsAPI.adminReply(notifId, adminReply);
    setServerNotifs(prev =>
      prev.map(n => n.id === notifId ? { ...n, admin_reply: adminReply } : n),
    );
    return result;
  }, []);

  const deleteServerNotif = useCallback(async (notifId) => {
    await notificationsAPI.adminDelete(notifId);
    setServerNotifs(prev => prev.filter(n => n.id !== notifId));
    setServerTotal(t => Math.max(0, t - 1));
  }, []);

  const sendChecklist  = useCallback(async (p) => { const r = await notificationsAPI.sendChecklist(p);  fetchServerNotifs(1, true); return r; }, [fetchServerNotifs]);
  const confirmPayment = useCallback(async (p) => { const r = await notificationsAPI.confirmPayment(p); fetchServerNotifs(1, true); return r; }, [fetchServerNotifs]);
  const requestPayment = useCallback(async (p) => { const r = await notificationsAPI.requestPayment(p); fetchServerNotifs(1, true); return r; }, [fetchServerNotifs]);

  const loadMoreServer = useCallback(() => {
    if (serverPage < serverPages && !serverLoading) fetchServerNotifs(serverPage + 1);
  }, [fetchServerNotifs, serverLoading, serverPage, serverPages]);

  const checklistRequests = serverNotifs.filter(n => n.type === 'admin_checklist_request');
  const awaitingReply     = serverNotifs.filter(n => n.reply_text && !n.admin_reply);

  const value = {
    // UI toasts (Redux)
    items, unreadCount, panelOpen,
    notify, notifyBooking, notifyMessage, notifyChat,
    markRead:    (id) => dispatch(markRead(id)),
    markAllRead: ()   => dispatch(markAllRead()),
    remove:      (id) => dispatch(removeNotification(id)),
    clearAll:    ()   => dispatch(clearAll()),
    togglePanel: ()   => dispatch(togglePanel()),
    closePanel:  ()   => dispatch(closePanel()),

    // Server state
    serverNotifs, serverStats, serverLoading,
    serverTotal, serverPage, serverPages,
    targetGroups, checklistRequests, awaitingReply,
    panelItems: serverNotifs.slice(0, 8),

    // Server actions
    fetchServerNotifs, loadMoreServer,
    sendNotification, sendAdminReply,
    deleteServerNotif, sendChecklist,
    confirmPayment, requestPayment,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotificationContext = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationContext must be inside NotificationProvider');
  return ctx;
};

export default NotificationContext;

function mapTypeToRedux(serverType = '') {
  if (serverType.includes('booking')) return NOTIFICATION_TYPES.BOOKING || 'booking';
  if (serverType.includes('chat'))    return NOTIFICATION_TYPES.CHAT    || 'chat';
  if (serverType.includes('message')) return NOTIFICATION_TYPES.MESSAGE || 'message';
  return NOTIFICATION_TYPES.INFO || 'info';
}
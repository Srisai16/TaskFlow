import { useEffect, useState, useCallback } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

/**
 * Owns the notification list + unread count and keeps them in sync over a
 * native WebSocket (Spring TextWebSocketHandler at /ws/notifications). Falls
 * back gracefully to polling the REST endpoint if the socket is unavailable.
 */
export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        api.get("/notifications"),
        api.get("/notifications/unread-count"),
      ]);
      setItems(listRes.data);
      setUnread(countRes.data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    refresh();

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    let ws;
    let retryTimer;
    let closedByUs = false;

    const connect = () => {
      ws = new WebSocket(
        `${protocol}://${window.location.host}/ws/notifications`
      );
      ws.onopen = () =>
        ws.send(JSON.stringify({ type: "SUBSCRIBE", userId: user.id }));
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg && msg.type === "NOTIFICATION" && msg.data) {
            setItems((prev) => [msg.data, ...prev].slice(0, 50));
            setUnread((u) => u + 1);
          }
        } catch {
          // ignore malformed frames
        }
      };
      ws.onclose = () => {
        if (!closedByUs) retryTimer = setTimeout(connect, 5000);
      };
    };

    connect();
    return () => {
      closedByUs = true;
      if (ws) ws.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [user, refresh]);

  const markRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnread((u) => Math.max(0, u - 1));
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await Promise.all(
        items.filter((n) => !n.isRead).map((n) => api.post(`/notifications/${n.id}/read`))
      );
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    } catch {
      // ignore
    }
  };

  return { items, unread, markRead, markAllRead };
}
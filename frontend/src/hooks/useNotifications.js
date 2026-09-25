import { useCallback, useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [listResponse, countResponse] = await Promise.all([
        api.get("/notifications"),
        api.get("/notifications/unread-count"),
      ]);
      setItems(listResponse.data);
      setUnread(countResponse.data);
    } catch {
      setError("Notifications are temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setUnread(0);
      setLoading(false);
      return undefined;
    }

    refresh();
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    let socket;
    let retryTimer;
    let closedByUs = false;

    const connect = () => {
      socket = new WebSocket(`${protocol}://${window.location.host}/ws/notifications`);
      socket.onopen = () => {
        socket.send(JSON.stringify({ type: "SUBSCRIBE", userId: user.id }));
      };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type === "NOTIFICATION" && message.data) {
            setItems((current) => [message.data, ...current].slice(0, 50));
            setUnread((current) => current + 1);
          }
        } catch {
          setError("A live update could not be read.");
        }
      };
      socket.onclose = () => {
        if (!closedByUs) retryTimer = setTimeout(connect, 5000);
      };
    };

    connect();
    return () => {
      closedByUs = true;
      socket?.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [refresh, user]);

  const markRead = async (id) => {
    setError("");
    try {
      await api.post(`/notifications/${id}/read`);
      setItems((current) => current.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
      setUnread((current) => Math.max(0, current - 1));
      return true;
    } catch {
      setError("Could not update that notification.");
      return false;
    }
  };

  const markAllRead = async () => {
    const unreadItems = items.filter((item) => !item.isRead);
    if (!unreadItems.length) return;
    setError("");
    try {
      await Promise.all(unreadItems.map((item) => api.post(`/notifications/${item.id}/read`)));
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnread(0);
      return true;
    } catch {
      setError("Could not mark notifications as read.");
      return false;
    }
  };

  return { items, unread, loading, error, refresh, markRead, markAllRead };
}

package com.taskflow.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Registers each connected user (identified by a SUBSCRIBE message) and pushes
 * real-time notifications to their open socket. In-memory session registry is
 * fine for a single-node demo; swap for Redis pub/sub in a clustered setup.
 */
@Component
public class NotificationWsHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(NotificationWsHandler.class);

    private final ObjectMapper objectMapper;
    private final Map<Long, WebSocketSession> sessionsByUser = new ConcurrentHashMap<>();

    public NotificationWsHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        JsonNode root = objectMapper.readTree(message.getPayload());
        if ("SUBSCRIBE".equals(root.path("type").asText()) && root.has("userId")) {
            Long userId = root.path("userId").asLong();
            WebSocketSession existing = sessionsByUser.put(userId, session);
            if (existing != null && existing.isOpen()) {
                existing.close(CloseStatus.POLICY_VIOLATION);
            }
            log.debug("Subscribed ws for userId={}", userId);
        }
    }

    public void broadcastToUser(Long userId, String payload) {
        WebSocketSession session = sessionsByUser.get(userId);
        if (session == null || !session.isOpen()) {
            return;
        }
        try {
            synchronized (session) {
                session.sendMessage(new TextMessage(payload));
            }
        } catch (Exception ex) {
            log.warn("Failed to push ws message to userId={}", userId, ex);
            sessionsByUser.remove(userId);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessionsByUser.entrySet().removeIf(e -> e.getValue().equals(session));
    }
}
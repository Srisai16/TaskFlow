package com.taskflow.config;

import com.taskflow.websocket.NotificationWsHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final NotificationWsHandler notificationWsHandler;

    public WebSocketConfig(NotificationWsHandler notificationWsHandler) {
        this.notificationWsHandler = notificationWsHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(notificationWsHandler, "/ws/notifications")
                .setAllowedOrigins("*");
    }
}
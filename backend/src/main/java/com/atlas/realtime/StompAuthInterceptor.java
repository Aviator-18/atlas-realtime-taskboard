package com.atlas.realtime;

import com.atlas.board.persistence.BoardMemberRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.messaging.support.NativeMessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class StompAuthInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(StompAuthInterceptor.class);
    private static final Pattern BOARD_TOPIC_PATTERN = Pattern.compile("^/topic/boards/(\\d+)$");

    private final JwtDecoder jwtDecoder;
    private final BoardMemberRepository boardMemberRepository;

    public StompAuthInterceptor(JwtDecoder jwtDecoder, BoardMemberRepository boardMemberRepository) {
        this.jwtDecoder = jwtDecoder;
        this.boardMemberRepository = boardMemberRepository;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            handleConnect(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            handleSubscribe(accessor);
        } else if (StompCommand.SEND.equals(accessor.getCommand())) {
            throw new AccessDeniedException("Client publish is not permitted");
        }

        return message;
    }

    private void handleConnect(StompHeaderAccessor accessor) {
        String authHeader = extractAuthHeader(accessor);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("STOMP CONNECT rejected: missing or invalid Authorization header");
            throw new BadCredentialsException("Missing or invalid Authorization header in STOMP CONNECT frame");
        }

        String token = authHeader.substring(7).trim();
        try {
            Jwt jwt = jwtDecoder.decode(token);
            Long userId = Long.valueOf(jwt.getSubject());
            Principal principal = new UsernamePasswordAuthenticationToken(userId, null, Collections.emptyList());
            accessor.setUser(principal);
            log.debug("STOMP CONNECT authenticated user: {}", userId);
        } catch (JwtException | NumberFormatException ex) {
            log.warn("STOMP CONNECT rejected: JWT validation failed: {}", ex.getMessage());
            throw new BadCredentialsException("Invalid JWT token in STOMP CONNECT frame", ex);
        }
    }

    private void handleSubscribe(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null) {
            throw new AccessDeniedException("Destination required for SUBSCRIBE");
        }

        Matcher matcher = BOARD_TOPIC_PATTERN.matcher(destination);
        if (!matcher.matches()) {
            log.warn("STOMP SUBSCRIBE rejected: unauthorised destination: {}", destination);
            throw new AccessDeniedException("Destination not allowed: " + destination);
        }

        Principal principal = accessor.getUser();
        if (principal == null) {
            log.warn("STOMP SUBSCRIBE rejected: unauthenticated session for destination: {}", destination);
            throw new AccessDeniedException("Authentication required to subscribe to: " + destination);
        }

        Long userId = extractUserId(principal);
        Long boardId = Long.valueOf(matcher.group(1));

        if (!boardMemberRepository.existsByIdBoardIdAndIdUserId(boardId, userId)) {
            log.warn("STOMP SUBSCRIBE rejected: user {} is not a member of board {}", userId, boardId);
            throw new AccessDeniedException("User is not a member of board: " + boardId);
        }

        log.debug("STOMP SUBSCRIBE accepted for user {} on board {}", userId, boardId);
    }

    private Long extractUserId(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken tokenAuth && tokenAuth.getPrincipal() instanceof Long id) {
            return id;
        }
        try {
            return Long.valueOf(principal.getName());
        } catch (NumberFormatException ex) {
            throw new AccessDeniedException("Invalid principal name: " + principal.getName());
        }
    }

    @SuppressWarnings("unchecked")
    private String extractAuthHeader(StompHeaderAccessor accessor) {
        String header = accessor.getFirstNativeHeader("Authorization");
        if (header != null) {
            return header;
        }
        header = accessor.getFirstNativeHeader("authorization");
        if (header != null) {
            return header;
        }
        Object nativeHeadersObj = accessor.getMessageHeaders().get(NativeMessageHeaderAccessor.NATIVE_HEADERS);
        if (nativeHeadersObj instanceof Map<?, ?> rawMap) {
            for (Map.Entry<?, ?> entry : rawMap.entrySet()) {
                if (entry.getKey() instanceof String key && "Authorization".equalsIgnoreCase(key)) {
                    Object val = entry.getValue();
                    if (val instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof String strVal) {
                        return strVal;
                    }
                }
            }
        }
        return null;
    }
}

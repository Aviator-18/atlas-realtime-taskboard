package com.atlas.estimation.service;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class EstimationRateLimiter {

    private static final int MAX_REQUESTS_PER_WINDOW = 10;
    private static final long WINDOW_SECONDS = 60;

    private final Clock clock;
    private final Map<Long, Deque<Instant>> userRequests = new ConcurrentHashMap<>();

    public EstimationRateLimiter(Clock clock) {
        this.clock = clock;
    }

    public boolean tryAcquire(Long userId) {
        Instant now = clock.instant();
        Instant windowStart = now.minusSeconds(WINDOW_SECONDS);

        Deque<Instant> timestamps = userRequests.computeIfAbsent(userId, k -> new ArrayDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && timestamps.peekFirst().isBefore(windowStart)) {
                timestamps.pollFirst();
            }

            if (timestamps.size() >= MAX_REQUESTS_PER_WINDOW) {
                return false;
            }

            timestamps.addLast(now);
            return true;
        }
    }
}

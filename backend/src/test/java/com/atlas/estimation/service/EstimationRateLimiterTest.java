package com.atlas.estimation.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class EstimationRateLimiterTest {

    static class MutableClock extends Clock {
        private final AtomicReference<Instant> now;
        private final ZoneId zone;

        MutableClock(Instant initial) {
            this.now = new AtomicReference<>(initial);
            this.zone = ZoneId.of("UTC");
        }

        void advanceSeconds(long seconds) {
            now.updateAndGet(i -> i.plusSeconds(seconds));
        }

        @Override
        public ZoneId getZone() {
            return zone;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now.get();
        }
    }

    @Test
    @DisplayName("Allows up to 10 requests per minute and rejects the 11th")
    void allows_ten_per_minute_and_rejects_eleventh() {
        MutableClock clock = new MutableClock(Instant.parse("2026-11-13T10:00:00Z"));
        EstimationRateLimiter limiter = new EstimationRateLimiter(clock);
        Long userId = 42L;

        for (int i = 0; i < 10; i++) {
            assertThat(limiter.tryAcquire(userId)).as("Request " + (i + 1) + " should succeed").isTrue();
            clock.advanceSeconds(1);
        }

        // 11th request in the same minute
        assertThat(limiter.tryAcquire(userId)).as("11th request within 60s should be rejected").isFalse();

        // Advance clock past the 60s window
        clock.advanceSeconds(60);

        // Should allow requests again
        assertThat(limiter.tryAcquire(userId)).as("Request after window slides should succeed").isTrue();
    }

    @Test
    @DisplayName("Maintains independent rate limits per user")
    void maintains_independent_limits_per_user() {
        MutableClock clock = new MutableClock(Instant.parse("2026-11-13T10:00:00Z"));
        EstimationRateLimiter limiter = new EstimationRateLimiter(clock);

        for (int i = 0; i < 10; i++) {
            limiter.tryAcquire(1L);
        }
        assertThat(limiter.tryAcquire(1L)).isFalse();

        // User 2 has not exhausted their limit
        assertThat(limiter.tryAcquire(2L)).isTrue();
    }
}

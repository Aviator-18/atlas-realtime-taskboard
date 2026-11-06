package com.atlas.auth.web;

import java.time.Instant;

public record AuthResponse(
        String token,
        Instant expiresAt,
        UserResponse user
) {
}

package com.atlas.auth.web;

public record UserResponse(
        Long id,
        String displayName,
        String email
) {
}

package com.atlas.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

@Component
public class JwtProperties {

    private final String jwtSecret;
    private final List<String> corsOrigins;

    public JwtProperties(
            @Value("${atlas.security.jwt-secret:}") String jwtSecret,
            @Value("${atlas.security.cors-origins:http://localhost:5173}") String corsOrigins,
            Environment environment) {
        boolean isDev = environment.matchesProfiles("dev");
        if (!isDev) {
            if (jwtSecret == null || jwtSecret.getBytes(StandardCharsets.UTF_8).length < 32) {
                throw new IllegalStateException(
                        "ATLAS_JWT_SECRET must be configured and at least 32 bytes outside the dev profile"
                );
            }
        }
        this.jwtSecret = jwtSecret;
        this.corsOrigins = Arrays.stream(corsOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();
    }

    public String jwtSecret() {
        return jwtSecret;
    }

    public List<String> corsOrigins() {
        return corsOrigins;
    }
}

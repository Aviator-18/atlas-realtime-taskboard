package com.atlas.common;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtSecretStartupTests {

    @Test
    void refuses_to_start_outside_dev_profile_when_jwt_secret_is_missing() {
        MockEnvironment env = new MockEnvironment();
        // non-dev profile
        env.setActiveProfiles("prod");

        assertThatThrownBy(() -> new JwtProperties("", "http://localhost:5173", env))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ATLAS_JWT_SECRET must be configured and at least 32 bytes outside the dev profile");
    }

    @Test
    void refuses_to_start_outside_dev_profile_when_jwt_secret_is_shorter_than_32_bytes() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        assertThatThrownBy(() -> new JwtProperties("only-20-bytes-secret", "http://localhost:5173", env))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ATLAS_JWT_SECRET must be configured and at least 32 bytes outside the dev profile");
    }

    @Test
    void starts_outside_dev_profile_when_jwt_secret_is_at_least_32_bytes() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        JwtProperties properties = new JwtProperties(
                "this-secret-is-at-least-32-bytes-long-for-production",
                "http://localhost:5173",
                env
        );

        assertThat(properties.jwtSecret()).isEqualTo("this-secret-is-at-least-32-bytes-long-for-production");
        assertThat(properties.corsOrigins()).containsExactly("http://localhost:5173");
    }

    @Test
    void allows_startup_in_dev_profile_with_dev_key() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");

        JwtProperties properties = new JwtProperties(
                "dev-insecure-secret-key-at-least-32-bytes-long",
                "http://localhost:5173",
                env
        );

        assertThat(properties.jwtSecret()).isEqualTo("dev-insecure-secret-key-at-least-32-bytes-long");
    }
}

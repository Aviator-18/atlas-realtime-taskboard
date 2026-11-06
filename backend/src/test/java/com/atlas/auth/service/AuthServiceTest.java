package com.atlas.auth.service;

import com.atlas.auth.persistence.UserEntity;
import com.atlas.auth.persistence.UserRepository;
import com.atlas.auth.web.AuthResponse;
import com.atlas.auth.web.LoginRequest;
import com.atlas.auth.web.RegisterRequest;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private AuthService authService;
    private Clock fixedClock;

    private static final String TEST_SECRET = "test-secret-must-be-at-least-32-bytes-long-for-hmac";

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = new BCryptPasswordEncoder();
        fixedClock = Clock.fixed(Instant.parse("2026-11-09T08:30:00Z"), ZoneOffset.UTC);

        SecretKeySpec secretKey = new SecretKeySpec(TEST_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        JwtEncoder jwtEncoder = new NimbusJwtEncoder(new ImmutableSecret<>(secretKey));
        JwtService jwtService = new JwtService(jwtEncoder, fixedClock);

        authService = new AuthService(userRepository, passwordEncoder, jwtService, fixedClock);
    }

    @Test
    void successful_registration_hashes_password_and_returns_token_without_hash() {
        RegisterRequest request = new RegisterRequest("Priya Nair", "priya.nair@example.test", "secure-password-123");

        when(userRepository.existsByEmailIgnoreCase("priya.nair@example.test")).thenReturn(false);
        when(userRepository.saveAndFlush(any(UserEntity.class))).thenAnswer(invocation -> {
            UserEntity entity = invocation.getArgument(0);
            return entity;
        });

        AuthResponse response = authService.register(request);

        assertThat(response.token()).isNotBlank();
        assertThat(response.expiresAt()).isEqualTo(Instant.parse("2026-11-09T16:30:00Z"));
        assertThat(response.user().displayName()).isEqualTo("Priya Nair");
        assertThat(response.user().email()).isEqualTo("priya.nair@example.test");

        ArgumentCaptor<UserEntity> captor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).saveAndFlush(captor.capture());
        UserEntity savedEntity = captor.getValue();
        assertThat(savedEntity.getPasswordHash()).isNotEqualTo("secure-password-123");
        assertThat(passwordEncoder.matches("secure-password-123", savedEntity.getPasswordHash())).isTrue();
        assertThat(savedEntity.toString()).doesNotContain("secure-password-123");
        assertThat(savedEntity.toString()).doesNotContain(savedEntity.getPasswordHash());
    }

    @Test
    void duplicate_email_rejected_with_duplicate_email_exception() {
        RegisterRequest request = new RegisterRequest("Priya Nair", "PRIYA.NAIR@EXAMPLE.TEST", "secure-password-123");
        when(userRepository.existsByEmailIgnoreCase("PRIYA.NAIR@EXAMPLE.TEST")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(DuplicateEmailException.class)
                .hasMessage("Email is already taken");
    }

    @Test
    void concurrent_duplicate_email_caught_and_mapped_to_duplicate_email_exception() {
        RegisterRequest request = new RegisterRequest("Priya Nair", "priya.nair@example.test", "secure-password-123");
        when(userRepository.existsByEmailIgnoreCase("priya.nair@example.test")).thenReturn(false);
        when(userRepository.saveAndFlush(any(UserEntity.class))).thenThrow(new DataIntegrityViolationException("duplicate key"));

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(DuplicateEmailException.class)
                .hasMessage("Email is already taken");
    }

    @Test
    void successful_login_returns_token_and_user_for_valid_credentials() {
        String hash = passwordEncoder.encode("correct-password-123");
        UserEntity user = new UserEntity("Priya Nair", "priya.nair@example.test", hash, fixedClock.instant());

        when(userRepository.findByEmailIgnoreCase("priya.nair@example.test")).thenReturn(Optional.of(user));

        AuthResponse response = authService.login(new LoginRequest("priya.nair@example.test", "correct-password-123"));

        assertThat(response.token()).isNotBlank();
        assertThat(response.user().displayName()).isEqualTo("Priya Nair");
        assertThat(response.user().email()).isEqualTo("priya.nair@example.test");
    }

    @Test
    void wrong_password_and_unknown_email_return_identical_exception() {
        String hash = passwordEncoder.encode("correct-password-123");
        UserEntity user = new UserEntity("Priya Nair", "priya.nair@example.test", hash, fixedClock.instant());
        when(userRepository.findByEmailIgnoreCase("priya.nair@example.test")).thenReturn(Optional.of(user));
        when(userRepository.findByEmailIgnoreCase("unknown@example.test")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("priya.nair@example.test", "wrong-password")))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid email or password");

        assertThatThrownBy(() -> authService.login(new LoginRequest("unknown@example.test", "any-password")))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid email or password");
    }
}

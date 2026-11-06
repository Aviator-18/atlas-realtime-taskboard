package com.atlas.auth;

import com.atlas.auth.persistence.UserRepository;
import com.atlas.auth.service.JwtService;
import com.atlas.auth.web.AuthResponse;
import com.atlas.auth.web.LoginRequest;
import com.atlas.auth.web.RegisterRequest;
import com.atlas.auth.web.UserResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class AuthIntegrationTests {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void configureDatasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void successful_registration_returns_201_with_token_and_user() {
        RegisterRequest request = new RegisterRequest("Priya Nair", "priya.nair@example.test", "valid-password-123");

        ResponseEntity<AuthResponse> response = restTemplate.postForEntity(
                "/api/auth/register",
                request,
                AuthResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().token()).isNotBlank();
        assertThat(response.getBody().expiresAt()).isNotNull();
        assertThat(response.getBody().user().id()).isNotNull();
        assertThat(response.getBody().user().displayName()).isEqualTo("Priya Nair");
        assertThat(response.getBody().user().email()).isEqualTo("priya.nair@example.test");
    }

    @Test
    void duplicate_email_rejected_with_409_email_taken() {
        RegisterRequest initial = new RegisterRequest("Priya Nair", "priya.nair@example.test", "valid-password-123");
        restTemplate.postForEntity("/api/auth/register", initial, AuthResponse.class);

        RegisterRequest duplicate = new RegisterRequest("Priya Nair 2", "priya.nair@example.test", "valid-password-456");
        ResponseEntity<Map> response = restTemplate.postForEntity(
                "/api/auth/register",
                duplicate,
                Map.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("code")).isEqualTo("EMAIL_TAKEN");
        assertThat(response.getBody().get("status")).isEqualTo(409);
    }

    @Test
    void duplicate_email_with_different_letter_case_rejected_with_409_email_taken() {
        RegisterRequest initial = new RegisterRequest("Priya Nair", "priya.nair@example.test", "valid-password-123");
        restTemplate.postForEntity("/api/auth/register", initial, AuthResponse.class);

        RegisterRequest upperCaseEmail = new RegisterRequest("Priya Nair 2", "PRIYA.NAIR@EXAMPLE.TEST", "valid-password-456");
        ResponseEntity<Map> response = restTemplate.postForEntity(
                "/api/auth/register",
                upperCaseEmail,
                Map.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("code")).isEqualTo("EMAIL_TAKEN");
        assertThat(response.getBody().get("status")).isEqualTo(409);
    }

    @Test
    void invalid_input_rejected_with_400_validation_failed() {
        RegisterRequest invalid = new RegisterRequest("", "not-an-email", "short");

        ResponseEntity<Map> response = restTemplate.postForEntity(
                "/api/auth/register",
                invalid,
                Map.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("code")).isEqualTo("VALIDATION_FAILED");
        assertThat(response.getBody().get("errors")).isNotNull();
    }

    @Test
    void successful_login() {
        RegisterRequest register = new RegisterRequest("Priya Nair", "priya.nair@example.test", "valid-password-123");
        restTemplate.postForEntity("/api/auth/register", register, AuthResponse.class);

        LoginRequest login = new LoginRequest("priya.nair@example.test", "valid-password-123");
        ResponseEntity<AuthResponse> response = restTemplate.postForEntity(
                "/api/auth/login",
                login,
                AuthResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().token()).isNotBlank();
        assertThat(response.getBody().user().displayName()).isEqualTo("Priya Nair");

        // Case-insensitive login verification
        LoginRequest upperCaseLogin = new LoginRequest("PRIYA.NAIR@EXAMPLE.TEST", "valid-password-123");
        ResponseEntity<AuthResponse> upperCaseResponse = restTemplate.postForEntity(
                "/api/auth/login",
                upperCaseLogin,
                AuthResponse.class
        );
        assertThat(upperCaseResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void wrong_password_and_unknown_email_return_the_same_response() {
        RegisterRequest register = new RegisterRequest("Priya Nair", "priya.nair@example.test", "valid-password-123");
        restTemplate.postForEntity("/api/auth/register", register, AuthResponse.class);

        LoginRequest wrongPassword = new LoginRequest("priya.nair@example.test", "wrong-password");
        ResponseEntity<Map> wrongPasswordResponse = restTemplate.postForEntity(
                "/api/auth/login",
                wrongPassword,
                Map.class
        );

        LoginRequest unknownEmail = new LoginRequest("unknown@example.test", "wrong-password");
        ResponseEntity<Map> unknownEmailResponse = restTemplate.postForEntity(
                "/api/auth/login",
                unknownEmail,
                Map.class
        );

        assertThat(wrongPasswordResponse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(unknownEmailResponse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        assertThat(wrongPasswordResponse.getBody()).isEqualTo(unknownEmailResponse.getBody());
        assertThat(wrongPasswordResponse.getBody().get("code")).isEqualTo("INVALID_CREDENTIALS");
    }

    @Test
    void protected_endpoint_rejects_missing_token() {
        ResponseEntity<Map> response = restTemplate.getForEntity("/api/me", Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("code")).isEqualTo("UNAUTHENTICATED");
    }

    @Test
    void protected_endpoint_rejects_expired_token() {
        RegisterRequest register = new RegisterRequest("Priya Nair", "priya.nair@example.test", "valid-password-123");
        ResponseEntity<AuthResponse> registerResponse = restTemplate.postForEntity(
                "/api/auth/register",
                register,
                AuthResponse.class
        );

        Long userId = registerResponse.getBody().user().id();
        var userEntity = userRepository.findById(userId).orElseThrow();

        Instant pastIssuedAt = Instant.now().minus(10, ChronoUnit.HOURS);
        Instant pastExpiresAt = Instant.now().minus(2, ChronoUnit.HOURS);
        JwtService.TokenResult expiredToken = jwtService.generateToken(userEntity, pastIssuedAt, pastExpiresAt);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(expiredToken.token());
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<Map> response = restTemplate.exchange("/api/me", HttpMethod.GET, entity, Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("code")).isEqualTo("UNAUTHENTICATED");
    }

    @Test
    void valid_token_reaches_api_me() {
        RegisterRequest register = new RegisterRequest("Priya Nair", "priya.nair@example.test", "valid-password-123");
        ResponseEntity<AuthResponse> registerResponse = restTemplate.postForEntity(
                "/api/auth/register",
                register,
                AuthResponse.class
        );

        String token = registerResponse.getBody().token();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<UserResponse> response = restTemplate.exchange("/api/me", HttpMethod.GET, entity, UserResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().displayName()).isEqualTo("Priya Nair");
        assertThat(response.getBody().email()).isEqualTo("priya.nair@example.test");
    }
}

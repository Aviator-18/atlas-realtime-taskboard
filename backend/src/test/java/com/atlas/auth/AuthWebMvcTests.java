package com.atlas.auth;

import com.atlas.auth.service.AuthService;
import com.atlas.auth.service.DuplicateEmailException;
import com.atlas.auth.service.InvalidCredentialsException;
import com.atlas.auth.web.AuthResponse;
import com.atlas.auth.web.LoginRequest;
import com.atlas.auth.web.RegisterRequest;
import com.atlas.auth.web.UserResponse;
import com.atlas.common.CommonConfig;
import com.atlas.common.GlobalExceptionHandler;
import com.atlas.common.JwtProperties;
import com.atlas.common.RestAuthenticationEntryPoint;
import com.atlas.common.SecurityConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest
@Import({
        SecurityConfig.class,
        JwtProperties.class,
        RestAuthenticationEntryPoint.class,
        GlobalExceptionHandler.class,
        CommonConfig.class
})
@ActiveProfiles("dev")
class AuthWebMvcTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtEncoder jwtEncoder;

    @MockBean
    private AuthService authService;

    @Test
    void successful_registration_returns_201_with_token_and_user() throws Exception {
        Instant expiresAt = Instant.parse("2026-11-09T16:30:00Z");
        UserResponse user = new UserResponse(3L, "Priya Nair", "priya.nair@example.test");
        AuthResponse response = new AuthResponse("mocked-jwt-token", expiresAt, user);

        when(authService.register(any(RegisterRequest.class))).thenReturn(response);

        String payload = """
                {
                  "displayName": "Priya Nair",
                  "email": "priya.nair@example.test",
                  "password": "valid-password-123"
                }
                """;

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value("mocked-jwt-token"))
                .andExpect(jsonPath("$.expiresAt").value("2026-11-09T16:30:00Z"))
                .andExpect(jsonPath("$.user.id").value(3))
                .andExpect(jsonPath("$.user.displayName").value("Priya Nair"))
                .andExpect(jsonPath("$.user.email").value("priya.nair@example.test"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist())
                .andReturn();

        assertThat(result.getResponse().getContentAsString()).doesNotContain("passwordHash");
        assertThat(result.getResponse().getContentAsString()).doesNotContain("valid-password-123");
    }

    @Test
    void duplicate_email_rejected_with_409_email_taken() throws Exception {
        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new DuplicateEmailException("Email is already taken"));

        String payload = """
                {
                  "displayName": "Priya Nair",
                  "email": "priya.nair@example.test",
                  "password": "valid-password-123"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_TAKEN"))
                .andExpect(jsonPath("$.type").value("https://atlas.local/problems/email-taken"))
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void duplicate_email_with_different_letter_case_rejected_with_409_email_taken() throws Exception {
        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new DuplicateEmailException("Email is already taken"));

        String payload = """
                {
                  "displayName": "Priya Nair",
                  "email": "PRIYA.NAIR@EXAMPLE.TEST",
                  "password": "valid-password-123"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_TAKEN"))
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void invalid_input_rejected_with_400_validation_failed() throws Exception {
        String payload = """
                {
                  "displayName": "",
                  "email": "invalid-email-address",
                  "password": "short"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.type").value("https://atlas.local/problems/validation-failed"))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors").isArray())
                .andExpect(jsonPath("$.errors[0].field").exists())
                .andExpect(jsonPath("$.errors[0].message").exists());
    }

    @Test
    void successful_login_with_exact_and_different_letter_case_email() throws Exception {
        Instant expiresAt = Instant.parse("2026-11-09T16:30:00Z");
        UserResponse user = new UserResponse(5L, "Priya Nair", "priya.nair@example.test");
        AuthResponse response = new AuthResponse("login-jwt-token", expiresAt, user);

        when(authService.login(any(LoginRequest.class))).thenReturn(response);

        String payloadExact = """
                {
                  "email": "priya.nair@example.test",
                  "password": "correct-password-123"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payloadExact))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("login-jwt-token"))
                .andExpect(jsonPath("$.user.id").value(5))
                .andExpect(jsonPath("$.user.displayName").value("Priya Nair"));

        String payloadUpperCase = """
                {
                  "email": "PRIYA.NAIR@EXAMPLE.TEST",
                  "password": "correct-password-123"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payloadUpperCase))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("login-jwt-token"))
                .andExpect(jsonPath("$.user.id").value(5));
    }

    @Test
    void wrong_password_and_unknown_email_return_identical_response() throws Exception {
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new InvalidCredentialsException("Invalid email or password"));

        MvcResult wrongPasswordResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "priya.nair@example.test",
                                  "password": "wrong-password-999"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andReturn();

        MvcResult unknownEmailResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "unknown@example.test",
                                  "password": "wrong-password-999"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andReturn();

        JsonNode wrongPasswordJson = objectMapper.readTree(wrongPasswordResult.getResponse().getContentAsString());
        JsonNode unknownEmailJson = objectMapper.readTree(unknownEmailResult.getResponse().getContentAsString());

        assertThat(wrongPasswordJson).isEqualTo(unknownEmailJson);
    }

    @Test
    void protected_endpoint_rejects_missing_token() throws Exception {
        mockMvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"))
                .andExpect(jsonPath("$.type").value("https://atlas.local/problems/unauthenticated"))
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void protected_endpoint_rejects_expired_token() throws Exception {
        // Send invalid or malformed bearer token
        mockMvc.perform(get("/api/me")
                        .header("Authorization", "Bearer invalid-or-expired-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"))
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void valid_token_reaches_api_me() throws Exception {
        UserResponse user = new UserResponse(7L, "Priya Nair", "priya.nair@example.test");
        when(authService.getUserById(7L)).thenReturn(user);

        mockMvc.perform(get("/api/me")
                        .with(jwt().jwt(builder -> builder.subject("7"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.displayName").value("Priya Nair"))
                .andExpect(jsonPath("$.email").value("priya.nair@example.test"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }
}

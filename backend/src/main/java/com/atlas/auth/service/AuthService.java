package com.atlas.auth.service;

import com.atlas.auth.persistence.UserEntity;
import com.atlas.auth.persistence.UserRepository;
import com.atlas.auth.web.AuthResponse;
import com.atlas.auth.web.LoginRequest;
import com.atlas.auth.web.RegisterRequest;
import com.atlas.auth.web.UserResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class AuthService {

    private static final String INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";
    // Fixed dummy hash to ensure constant-time verification when user is not found
    private static final String DUMMY_HASH = "$2a$10$wT8f/c9JcEqV.Vz1/6sB5.7sN1L0HkI8y3C0S3d5G8u6U5c7y8a.";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final Clock clock;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            Clock clock) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.clock = clock;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String trimmedEmail = request.email() != null ? request.email().trim() : "";
        if (userRepository.existsByEmailIgnoreCase(trimmedEmail)) {
            throw new DuplicateEmailException("Email is already taken");
        }

        String trimmedPassword = request.password() != null ? request.password().trim() : "";
        String passwordHash = passwordEncoder.encode(trimmedPassword);
        UserEntity user = new UserEntity(
                request.displayName() != null ? request.displayName().trim() : "",
                trimmedEmail,
                passwordHash,
                clock.instant()
        );

        try {
            UserEntity savedUser = userRepository.saveAndFlush(user);
            JwtService.TokenResult tokenResult = jwtService.generateToken(savedUser);
            return new AuthResponse(
                    tokenResult.token(),
                    tokenResult.expiresAt(),
                    new UserResponse(savedUser.getId(), savedUser.getDisplayName(), savedUser.getEmail())
            );
        } catch (DataIntegrityViolationException ex) {
            throw new DuplicateEmailException("Email is already taken");
        }
    }

    public AuthResponse login(LoginRequest request) {
        String trimmedEmail = request.email() != null ? request.email().trim() : "";
        String trimmedPassword = request.password() != null ? request.password().trim() : "";
        Optional<UserEntity> userOpt = userRepository.findByEmailIgnoreCase(trimmedEmail);

        if (userOpt.isEmpty()) {
            // Run password check against dummy hash to prevent timing attacks
            passwordEncoder.matches(trimmedPassword, DUMMY_HASH);
            throw new InvalidCredentialsException(INVALID_CREDENTIALS_MESSAGE);
        }

        UserEntity user = userOpt.get();
        if (!passwordEncoder.matches(trimmedPassword, user.getPasswordHash())) {
            throw new InvalidCredentialsException(INVALID_CREDENTIALS_MESSAGE);
        }

        JwtService.TokenResult tokenResult = jwtService.generateToken(user);
        return new AuthResponse(
                tokenResult.token(),
                tokenResult.expiresAt(),
                new UserResponse(user.getId(), user.getDisplayName(), user.getEmail())
        );
    }

    public UserResponse getUserById(Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidCredentialsException("User not found"));
        return new UserResponse(user.getId(), user.getDisplayName(), user.getEmail());
    }
}

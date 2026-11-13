package com.atlas.common.service;

import com.atlas.auth.persistence.UserEntity;
import com.atlas.auth.persistence.UserRepository;
import com.atlas.board.persistence.BoardColumnEntity;
import com.atlas.board.persistence.BoardColumnRepository;
import com.atlas.board.persistence.BoardEntity;
import com.atlas.board.persistence.BoardMemberEntity;
import com.atlas.board.persistence.BoardMemberRepository;
import com.atlas.board.persistence.BoardRepository;
import com.atlas.board.persistence.ColumnKind;
import com.atlas.board.persistence.Role;
import com.atlas.task.persistence.Priority;
import com.atlas.task.persistence.TaskEntity;
import com.atlas.task.persistence.TaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;

/**
 * Seeds initial demo data for local development.
 * Active strictly in the dev profile and idempotent.
 */
@Component
@Profile("dev")
public class DevSeedRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevSeedRunner.class);

    public static final String SHARED_DEV_PASSWORD = "AtlasDev2026!";
    public static final String BOARD_NAME = "Checkout API, sprint 12";
    public static final String INVITE_CODE = "PAYSPR12";

    private final UserRepository userRepository;
    private final BoardRepository boardRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final BoardColumnRepository boardColumnRepository;
    private final TaskRepository taskRepository;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;
    private final Environment environment;

    public DevSeedRunner(UserRepository userRepository,
                         BoardRepository boardRepository,
                         BoardMemberRepository boardMemberRepository,
                         BoardColumnRepository boardColumnRepository,
                         TaskRepository taskRepository,
                         PasswordEncoder passwordEncoder,
                         Clock clock,
                         Environment environment) {
        this.userRepository = userRepository;
        this.boardRepository = boardRepository;
        this.boardMemberRepository = boardMemberRepository;
        this.boardColumnRepository = boardColumnRepository;
        this.taskRepository = taskRepository;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
        this.environment = environment;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // Enforce that this runner refuses to execute outside the dev profile
        boolean isDevActive = Arrays.asList(environment.getActiveProfiles()).contains("dev");
        if (!isDevActive) {
            throw new IllegalStateException("DevSeedRunner is strictly forbidden to run outside the 'dev' profile.");
        }

        // Idempotency: skip if seed board already exists
        if (boardRepository.findByInviteCode(INVITE_CODE).isPresent()
                || userRepository.existsByEmailIgnoreCase("priya@example.test")) {
            log.info("Development seed data already present. Skipping initialization.");
            return;
        }

        log.info("Initializing development demo dataset for {}", BOARD_NAME);
        Instant now = clock.instant();
        String passwordHash = passwordEncoder.encode(SHARED_DEV_PASSWORD);

        // 1. Create the three users
        UserEntity priya = userRepository.save(new UserEntity("Priya Nair", "priya@example.test", passwordHash, now.minus(Duration.ofDays(10))));
        UserEntity arjun = userRepository.save(new UserEntity("Arjun Mehta", "arjun@example.test", passwordHash, now.minus(Duration.ofDays(10))));
        UserEntity sana = userRepository.save(new UserEntity("Sana Qureshi", "sana@example.test", passwordHash, now.minus(Duration.ofDays(10))));

        // 2. Create the board
        BoardEntity board = boardRepository.save(new BoardEntity(BOARD_NAME, INVITE_CODE, priya.getId(), now.minus(Duration.ofDays(7))));

        // 3. Create memberships (Priya as OWNER, Arjun and Sana as MEMBERS)
        boardMemberRepository.save(new BoardMemberEntity(board.getId(), priya.getId(), Role.OWNER, now.minus(Duration.ofDays(7))));
        boardMemberRepository.save(new BoardMemberEntity(board.getId(), arjun.getId(), Role.MEMBER, now.minus(Duration.ofDays(6))));
        boardMemberRepository.save(new BoardMemberEntity(board.getId(), sana.getId(), Role.MEMBER, now.minus(Duration.ofDays(6))));

        // 4. Create the three standard columns
        BoardColumnEntity todoCol = boardColumnRepository.save(new BoardColumnEntity(board.getId(), "To do", ColumnKind.TODO, 1024));
        BoardColumnEntity inProgressCol = boardColumnRepository.save(new BoardColumnEntity(board.getId(), "In progress", ColumnKind.IN_PROGRESS, 2048));
        BoardColumnEntity doneCol = boardColumnRepository.save(new BoardColumnEntity(board.getId(), "Done", ColumnKind.DONE, 3072));

        // 5. Create fourteen tasks (6 completed in Done, 4 in progress, 4 in todo)
        List<TaskEntity> seedTasks = List.of(
                // 6 Completed tasks in Done with estimates, startedAt and completedAt
                new TaskEntity(
                        board.getId(), doneCol.getId(),
                        "Stripe payment intent webhook handler",
                        "Verify signature headers and persist charge events into ledger.",
                        1024, priya.getId(), BigDecimal.valueOf(4.0), Priority.HIGH, null,
                        priya.getId(), now.minus(Duration.ofDays(6)), now.minus(Duration.ofDays(4)),
                        now.minus(Duration.ofDays(6)), now.minus(Duration.ofDays(4))
                ),
                new TaskEntity(
                        board.getId(), doneCol.getId(),
                        "Idempotency key header validation and cache",
                        "Enforce Idempotency-Key header on POST /v1/charges using Redis with 24 hour TTL.",
                        2048, arjun.getId(), BigDecimal.valueOf(3.0), Priority.MEDIUM, null,
                        arjun.getId(), now.minus(Duration.ofDays(5)), now.minus(Duration.ofDays(3)),
                        now.minus(Duration.ofDays(5)), now.minus(Duration.ofDays(3))
                ),
                new TaskEntity(
                        board.getId(), doneCol.getId(),
                        "Refund API endpoint with standard reason codes",
                        "Accept partial and full refunds with validated reasons matching the payment scheme.",
                        3072, sana.getId(), BigDecimal.valueOf(5.0), Priority.HIGH, null,
                        sana.getId(), now.minus(Duration.ofDays(5)), now.minus(Duration.ofDays(3)),
                        now.minus(Duration.ofDays(4)), now.minus(Duration.ofDays(3))
                ),
                new TaskEntity(
                        board.getId(), doneCol.getId(),
                        "Currency conversion rounding fix for zero-decimal currencies",
                        "Correct smallest-currency-unit calculation for JPY and KRW transactions.",
                        4096, priya.getId(), BigDecimal.valueOf(2.0), Priority.MEDIUM, null,
                        priya.getId(), now.minus(Duration.ofDays(4)), now.minus(Duration.ofDays(2)),
                        now.minus(Duration.ofDays(3)), now.minus(Duration.ofDays(2))
                ),
                new TaskEntity(
                        board.getId(), doneCol.getId(),
                        "Card expiration date sanitization and Luhn check",
                        "Validate Primary Account Number checksum and expiration before tokenisation dispatch.",
                        5120, arjun.getId(), BigDecimal.valueOf(1.5), Priority.LOW, null,
                        arjun.getId(), now.minus(Duration.ofDays(3)), now.minus(Duration.ofDays(1)),
                        now.minus(Duration.ofDays(2)), now.minus(Duration.ofDays(1))
                ),
                new TaskEntity(
                        board.getId(), doneCol.getId(),
                        "3D Secure 2.0 challenge flow callback handler",
                        "Process ACS authentication redirects and update payment attempt status.",
                        6144, sana.getId(), BigDecimal.valueOf(8.0), Priority.HIGH, null,
                        sana.getId(), now.minus(Duration.ofDays(3)), now.minus(Duration.ofHours(18)),
                        now.minus(Duration.ofDays(2)), now.minus(Duration.ofHours(18))
                ),

                // 4 In progress tasks (startedAt set, completedAt null)
                new TaskEntity(
                        board.getId(), inProgressCol.getId(),
                        "Apple Pay merchant validation session endpoint",
                        "Request merchant validation token from Apple servers during session handshake.",
                        1024, priya.getId(), BigDecimal.valueOf(6.0), Priority.HIGH, null,
                        priya.getId(), now.minus(Duration.ofDays(2)), now.minus(Duration.ofHours(6)),
                        now.minus(Duration.ofDays(1)), null
                ),
                new TaskEntity(
                        board.getId(), inProgressCol.getId(),
                        "Dead-letter queue for failed payment webhook deliveries",
                        "Route unacknowledged merchant webhook notifications to retry queue with exponential backoff.",
                        2048, arjun.getId(), BigDecimal.valueOf(4.5), Priority.HIGH, null,
                        arjun.getId(), now.minus(Duration.ofDays(1)), now.minus(Duration.ofHours(4)),
                        now.minus(Duration.ofHours(20)), null
                ),
                new TaskEntity(
                        board.getId(), inProgressCol.getId(),
                        "Checkout session expiry job and cancellation events",
                        "Identify uncompleted customer checkout sessions older than 30 minutes and emit cancellation events.",
                        3072, sana.getId(), BigDecimal.valueOf(3.5), Priority.MEDIUM, null,
                        sana.getId(), now.minus(Duration.ofHours(18)), now.minus(Duration.ofHours(2)),
                        now.minus(Duration.ofHours(8)), null
                ),
                new TaskEntity(
                        board.getId(), inProgressCol.getId(),
                        "Receipt email template integration with billing address",
                        "Render formatted customer transaction details into transactional email dispatch payload.",
                        4096, null, BigDecimal.valueOf(2.5), Priority.LOW, null,
                        priya.getId(), now.minus(Duration.ofHours(12)), now.minus(Duration.ofHours(1)),
                        now.minus(Duration.ofHours(4)), null
                ),

                // 4 To do tasks (startedAt null, completedAt null)
                new TaskEntity(
                        board.getId(), todoCol.getId(),
                        "Fraud detection score threshold configuration",
                        "Provide configuration parameter for synchronous risk assessment scoring rules.",
                        1024, sana.getId(), BigDecimal.valueOf(3.0), Priority.MEDIUM, null,
                        sana.getId(), now.minus(Duration.ofHours(24)), now.minus(Duration.ofHours(24)),
                        null, null
                ),
                new TaskEntity(
                        board.getId(), todoCol.getId(),
                        "Dispute evidence upload API and webhook listener",
                        "Enable merchants to attach evidence files for cardholder chargeback disputes.",
                        2048, priya.getId(), BigDecimal.valueOf(7.0), Priority.HIGH, null,
                        priya.getId(), now.minus(Duration.ofHours(16)), now.minus(Duration.ofHours(16)),
                        null, null
                ),
                new TaskEntity(
                        board.getId(), todoCol.getId(),
                        "Audit logging for partial refund authorisations",
                        "Record actor identity, timestamp, and manager override reference for manual refunds.",
                        3072, arjun.getId(), BigDecimal.valueOf(2.0), Priority.LOW, null,
                        arjun.getId(), now.minus(Duration.ofHours(8)), now.minus(Duration.ofHours(8)),
                        null, null
                ),
                new TaskEntity(
                        board.getId(), todoCol.getId(),
                        "Rate limiting for guest checkout endpoints",
                        "Apply token bucket rate limit to unauthenticated card tokenization requests.",
                        4096, null, null, Priority.MEDIUM, null,
                        priya.getId(), now.minus(Duration.ofHours(4)), now.minus(Duration.ofHours(4)),
                        null, null
                )
        );

        taskRepository.saveAll(seedTasks);
        log.info("Development demo dataset seeded successfully: 3 users, 1 board, 14 tasks.");
    }
}

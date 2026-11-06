package com.atlas.task;

import com.atlas.auth.persistence.UserEntity;
import com.atlas.auth.persistence.UserRepository;
import com.atlas.auth.service.JwtService;
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
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class TaskConcurrencyIntegrationTests {

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
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BoardRepository boardRepository;

    @Autowired
    private BoardMemberRepository boardMemberRepository;

    @Autowired
    private BoardColumnRepository boardColumnRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private JwtService jwtService;

    private String userToken;
    private Long boardId;
    private Long columnId;
    private Long userId;

    @BeforeEach
    void setUp() {
        taskRepository.deleteAll();
        boardColumnRepository.deleteAll();
        boardMemberRepository.deleteAll();
        boardRepository.deleteAll();
        userRepository.deleteAll();

        UserEntity user = userRepository.save(new UserEntity(
                "Priya Nair",
                "priya@example.test",
                "$2a$10$abcdefghijklmnopqrstuv",
                Instant.now()
        ));
        userId = user.getId();
        userToken = jwtService.generateToken(user).token();

        BoardEntity board = boardRepository.save(new BoardEntity(
                "Sprint 12",
                "K7M2QX9R",
                user.getId(),
                Instant.now()
        ));
        boardId = board.getId();

        boardMemberRepository.save(new BoardMemberEntity(
                board.getId(),
                user.getId(),
                Role.OWNER,
                Instant.now()
        ));

        BoardColumnEntity column = boardColumnRepository.save(new BoardColumnEntity(
                board.getId(),
                "To do",
                ColumnKind.TODO,
                1024
        ));
        columnId = column.getId();
    }

    @Test
    void concurrency_test_twenty_iterations_exactly_one_success_and_one_conflict() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            for (int i = 0; i < 20; i++) {
                // Create a new task at version 0
                TaskEntity task = taskRepository.save(new TaskEntity(
                        boardId,
                        columnId,
                        "Concurrent Task " + i,
                        "",
                        1024,
                        null,
                        null,
                        Priority.MEDIUM,
                        null,
                        userId,
                        Instant.now(),
                        Instant.now(),
                        null,
                        null
                ));
                Long taskId = task.getId();

                CountDownLatch readyLatch = new CountDownLatch(2);
                CountDownLatch startLatch = new CountDownLatch(1);

                Future<ResponseEntity<String>> futureA = executor.submit(() -> {
                    readyLatch.countDown();
                    startLatch.await();
                    return patchTask(taskId, 0L, "Update from Thread A");
                });

                Future<ResponseEntity<String>> futureB = executor.submit(() -> {
                    readyLatch.countDown();
                    startLatch.await();
                    return patchTask(taskId, 0L, "Update from Thread B");
                });

                // Wait until both threads are ready, then release them simultaneously
                assertThat(readyLatch.await(5, TimeUnit.SECONDS)).isTrue();
                startLatch.countDown();

                ResponseEntity<String> resA = futureA.get();
                ResponseEntity<String> resB = futureB.get();

                HttpStatus statusA = HttpStatus.valueOf(resA.getStatusCode().value());
                HttpStatus statusB = HttpStatus.valueOf(resB.getStatusCode().value());

                boolean oneSuccessOneConflict =
                        (statusA == HttpStatus.OK && statusB == HttpStatus.CONFLICT) ||
                        (statusA == HttpStatus.CONFLICT && statusB == HttpStatus.OK);

                assertThat(oneSuccessOneConflict)
                        .withFailMessage("Iteration %d failed: statusA=%s, statusB=%s", i, statusA, statusB)
                        .isTrue();

                ResponseEntity<String> conflictResponse = (statusA == HttpStatus.CONFLICT) ? resA : resB;
                JsonNode problem = objectMapper.readTree(conflictResponse.getBody());
                assertThat(problem.get("code").asText()).isEqualTo("TASK_VERSION_CONFLICT");
                assertThat(problem.get("currentTask").get("version").asLong()).isEqualTo(1L);
            }
        } finally {
            executor.shutdown();
        }
    }

    private ResponseEntity<String> patchTask(Long taskId, Long version, String newTitle) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(userToken);

        String body = String.format("""
                {
                  "version": %d,
                  "title": "%s"
                }
                """, version, newTitle);

        HttpEntity<String> entity = new HttpEntity<>(body, headers);
        return restTemplate.exchange("/api/tasks/" + taskId, HttpMethod.PATCH, entity, String.class);
    }
}

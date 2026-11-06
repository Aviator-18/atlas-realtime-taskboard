package com.atlas.board;

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

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class BoardTaskIntegrationTests {

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

    private UserEntity memberUser;
    private UserEntity nonMemberUser;
    private String memberToken;
    private String nonMemberToken;
    private BoardEntity board;
    private BoardColumnEntity todoColumn;
    private BoardColumnEntity inProgressColumn;
    private BoardColumnEntity doneColumn;

    @BeforeEach
    void setUp() {
        taskRepository.deleteAll();
        boardColumnRepository.deleteAll();
        boardMemberRepository.deleteAll();
        boardRepository.deleteAll();
        userRepository.deleteAll();

        memberUser = userRepository.save(new UserEntity("Priya Nair", "priya@example.test", "$2a$10$xyz", Instant.now()));
        nonMemberUser = userRepository.save(new UserEntity("Arjun Mehta", "arjun@example.test", "$2a$10$xyz", Instant.now()));

        memberToken = jwtService.generateToken(memberUser).token();
        nonMemberToken = jwtService.generateToken(nonMemberUser).token();

        board = boardRepository.save(new BoardEntity("Sprint 12", "K7M2QX9R", memberUser.getId(), Instant.now()));
        boardMemberRepository.save(new BoardMemberEntity(board.getId(), memberUser.getId(), Role.OWNER, Instant.now()));

        todoColumn = boardColumnRepository.save(new BoardColumnEntity(board.getId(), "To do", ColumnKind.TODO, 1024));
        inProgressColumn = boardColumnRepository.save(new BoardColumnEntity(board.getId(), "In progress", ColumnKind.IN_PROGRESS, 2048));
        doneColumn = boardColumnRepository.save(new BoardColumnEntity(board.getId(), "Done", ColumnKind.DONE, 3072));
    }

    private HttpHeaders authHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        return headers;
    }

    @Test
    void non_member_receives_403_on_board_and_task_endpoints() throws Exception {
        TaskEntity task = taskRepository.save(new TaskEntity(
                board.getId(), todoColumn.getId(), "Task 1", "", 1024,
                null, null, Priority.MEDIUM, null, memberUser.getId(),
                Instant.now(), Instant.now(), null, null
        ));

        // GET /api/boards/{boardId}
        ResponseEntity<String> getBoardRes = restTemplate.exchange(
                "/api/boards/" + board.getId(), HttpMethod.GET,
                new HttpEntity<>(authHeaders(nonMemberToken)), String.class
        );
        assertThat(getBoardRes.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(objectMapper.readTree(getBoardRes.getBody()).get("code").asText()).isEqualTo("NOT_A_MEMBER");

        // POST /api/boards/{boardId}/tasks
        String createTaskBody = String.format("""
                {
                  "columnId": %d,
                  "title": "Unauthorized task"
                }
                """, todoColumn.getId());
        ResponseEntity<String> createTaskRes = restTemplate.exchange(
                "/api/boards/" + board.getId() + "/tasks", HttpMethod.POST,
                new HttpEntity<>(createTaskBody, authHeaders(nonMemberToken)), String.class
        );
        assertThat(createTaskRes.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(objectMapper.readTree(createTaskRes.getBody()).get("code").asText()).isEqualTo("NOT_A_MEMBER");

        // PATCH /api/tasks/{taskId}
        String patchBody = """
                {
                  "version": 0,
                  "title": "Unauthorized patch"
                }
                """;
        ResponseEntity<String> patchRes = restTemplate.exchange(
                "/api/tasks/" + task.getId(), HttpMethod.PATCH,
                new HttpEntity<>(patchBody, authHeaders(nonMemberToken)), String.class
        );
        assertThat(patchRes.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(objectMapper.readTree(patchRes.getBody()).get("code").asText()).isEqualTo("NOT_A_MEMBER");

        // DELETE /api/tasks/{taskId}
        ResponseEntity<String> deleteRes = restTemplate.exchange(
                "/api/tasks/" + task.getId() + "?version=0", HttpMethod.DELETE,
                new HttpEntity<>(authHeaders(nonMemberToken)), String.class
        );
        assertThat(deleteRes.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(objectMapper.readTree(deleteRes.getBody()).get("code").asText()).isEqualTo("NOT_A_MEMBER");
    }

    @Test
    void stale_version_rejected_with_conflict_for_edit_move_and_delete() throws Exception {
        TaskEntity task = taskRepository.save(new TaskEntity(
                board.getId(), todoColumn.getId(), "Stale test task", "", 1024,
                null, null, Priority.MEDIUM, null, memberUser.getId(),
                Instant.now(), Instant.now(), null, null
        ));

        // 1. Edit with stale version (db has 0, sending 99)
        String editBody = """
                {
                  "version": 99,
                  "title": "New title"
                }
                """;
        ResponseEntity<String> editRes = restTemplate.exchange(
                "/api/tasks/" + task.getId(), HttpMethod.PATCH,
                new HttpEntity<>(editBody, authHeaders(memberToken)), String.class
        );
        assertThat(editRes.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        JsonNode editProblem = objectMapper.readTree(editRes.getBody());
        assertThat(editProblem.get("code").asText()).isEqualTo("TASK_VERSION_CONFLICT");
        assertThat(editProblem.get("currentTask").get("version").asLong()).isEqualTo(0L);

        // 2. Move with stale version
        String moveBody = String.format("""
                {
                  "version": 99,
                  "move": {
                    "columnId": %d,
                    "afterTaskId": null
                  }
                }
                """, inProgressColumn.getId());
        ResponseEntity<String> moveRes = restTemplate.exchange(
                "/api/tasks/" + task.getId(), HttpMethod.PATCH,
                new HttpEntity<>(moveBody, authHeaders(memberToken)), String.class
        );
        assertThat(moveRes.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);

        // 3. Delete with stale version
        ResponseEntity<String> deleteRes = restTemplate.exchange(
                "/api/tasks/" + task.getId() + "?version=99", HttpMethod.DELETE,
                new HttpEntity<>(authHeaders(memberToken)), String.class
        );
        assertThat(deleteRes.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        JsonNode deleteProblem = objectMapper.readTree(deleteRes.getBody());
        assertThat(deleteProblem.get("code").asText()).isEqualTo("TASK_VERSION_CONFLICT");
    }

    @Test
    void ordering_rules_append_top_between_and_rebalance() throws Exception {
        // 1. Append task A to empty column -> position 1024
        String bodyA = String.format("""
                {
                  "columnId": %d,
                  "title": "Task A"
                }
                """, todoColumn.getId());
        ResponseEntity<String> resA = restTemplate.exchange(
                "/api/boards/" + board.getId() + "/tasks", HttpMethod.POST,
                new HttpEntity<>(bodyA, authHeaders(memberToken)), String.class
        );
        assertThat(resA.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Long idA = objectMapper.readTree(resA.getBody()).get("id").asLong();
        assertThat(objectMapper.readTree(resA.getBody()).get("position").asInt()).isEqualTo(1024);

        // 2. Append task B -> position 2048
        String bodyB = String.format("""
                {
                  "columnId": %d,
                  "title": "Task B"
                }
                """, todoColumn.getId());
        ResponseEntity<String> resB = restTemplate.exchange(
                "/api/boards/" + board.getId() + "/tasks", HttpMethod.POST,
                new HttpEntity<>(bodyB, authHeaders(memberToken)), String.class
        );
        Long idB = objectMapper.readTree(resB.getBody()).get("id").asLong();
        assertThat(objectMapper.readTree(resB.getBody()).get("position").asInt()).isEqualTo(2048);

        // 3. Append task C -> position 3072
        String bodyC = String.format("""
                {
                  "columnId": %d,
                  "title": "Task C"
                }
                """, todoColumn.getId());
        ResponseEntity<String> resC = restTemplate.exchange(
                "/api/boards/" + board.getId() + "/tasks", HttpMethod.POST,
                new HttpEntity<>(bodyC, authHeaders(memberToken)), String.class
        );
        Long idC = objectMapper.readTree(resC.getBody()).get("id").asLong();
        assertThat(objectMapper.readTree(resC.getBody()).get("position").asInt()).isEqualTo(3072);

        // 4. Move C between A (1024) and B (2048) -> midpoint 1536
        String moveBetweenBody = String.format("""
                {
                  "version": 0,
                  "move": {
                    "columnId": %d,
                    "afterTaskId": %d
                  }
                }
                """, todoColumn.getId(), idA);
        ResponseEntity<String> moveBetweenRes = restTemplate.exchange(
                "/api/tasks/" + idC, HttpMethod.PATCH,
                new HttpEntity<>(moveBetweenBody, authHeaders(memberToken)), String.class
        );
        assertThat(moveBetweenRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(objectMapper.readTree(moveBetweenRes.getBody()).get("position").asInt()).isEqualTo(1536);

        // 5. Move B to top (afterTaskId: null) -> first is A (1024), new pos = 1024 - 1024 = 0
        String moveTopBody = String.format("""
                {
                  "version": 0,
                  "move": {
                    "columnId": %d,
                    "afterTaskId": null
                  }
                }
                """, todoColumn.getId());
        ResponseEntity<String> moveTopRes = restTemplate.exchange(
                "/api/tasks/" + idB, HttpMethod.PATCH,
                new HttpEntity<>(moveTopBody, authHeaders(memberToken)), String.class
        );
        assertThat(moveTopRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(objectMapper.readTree(moveTopRes.getBody()).get("position").asInt()).isEqualTo(0);

        // 6. Test rebalancing when gap < 2:
        // Set task positions directly to 1024 and 1025 with versions unchanged
        taskRepository.updatePositionWithoutVersionBump(idA, 1024);
        taskRepository.updatePositionWithoutVersionBump(idB, 1025);
        Long versionBeforeA = taskRepository.findById(idA).orElseThrow().getVersion();
        Long versionBeforeB = taskRepository.findById(idB).orElseThrow().getVersion();

        // Move task C between A and B
        String moveRebalanceBody = String.format("""
                {
                  "version": 1,
                  "move": {
                    "columnId": %d,
                    "afterTaskId": %d
                  }
                }
                """, todoColumn.getId(), idA);
        ResponseEntity<String> rebalanceRes = restTemplate.exchange(
                "/api/tasks/" + idC, HttpMethod.PATCH,
                new HttpEntity<>(moveRebalanceBody, authHeaders(memberToken)), String.class
        );
        assertThat(rebalanceRes.getStatusCode()).isEqualTo(HttpStatus.OK);

        // Check that positions were rebalanced to multiples of 1024 and versions were not changed
        TaskEntity updatedA = taskRepository.findById(idA).orElseThrow();
        TaskEntity updatedB = taskRepository.findById(idB).orElseThrow();
        assertThat(updatedA.getPosition()).isEqualTo(1024);
        assertThat(updatedB.getPosition()).isEqualTo(2048);
        assertThat(updatedA.getVersion()).isEqualTo(versionBeforeA);
        assertThat(updatedB.getVersion()).isEqualTo(versionBeforeB);
    }

    @Test
    void timestamps_transition_on_creation_and_moves_per_us07() throws Exception {
        // Create in TODO -> startedAt and completedAt are null
        String createBody = String.format("""
                {
                  "columnId": %d,
                  "title": "Timestamp task"
                }
                """, todoColumn.getId());
        ResponseEntity<String> createRes = restTemplate.exchange(
                "/api/boards/" + board.getId() + "/tasks", HttpMethod.POST,
                new HttpEntity<>(createBody, authHeaders(memberToken)), String.class
        );
        JsonNode taskJson = objectMapper.readTree(createRes.getBody());
        Long taskId = taskJson.get("id").asLong();
        assertThat(taskJson.get("startedAt").isNull()).isTrue();
        assertThat(taskJson.get("completedAt").isNull()).isTrue();

        // Move to IN_PROGRESS -> startedAt is set
        String moveToProgress = String.format("""
                {
                  "version": 0,
                  "move": {
                    "columnId": %d,
                    "afterTaskId": null
                  }
                }
                """, inProgressColumn.getId());
        ResponseEntity<String> progressRes = restTemplate.exchange(
                "/api/tasks/" + taskId, HttpMethod.PATCH,
                new HttpEntity<>(moveToProgress, authHeaders(memberToken)), String.class
        );
        JsonNode progressJson = objectMapper.readTree(progressRes.getBody());
        assertThat(progressJson.get("startedAt").isNull()).isFalse();
        assertThat(progressJson.get("completedAt").isNull()).isTrue();
        String startedAt = progressJson.get("startedAt").asText();

        // Move to DONE -> completedAt is set
        String moveToDone = String.format("""
                {
                  "version": 1,
                  "move": {
                    "columnId": %d,
                    "afterTaskId": null
                  }
                }
                """, doneColumn.getId());
        ResponseEntity<String> doneRes = restTemplate.exchange(
                "/api/tasks/" + taskId, HttpMethod.PATCH,
                new HttpEntity<>(moveToDone, authHeaders(memberToken)), String.class
        );
        JsonNode doneJson = objectMapper.readTree(doneRes.getBody());
        assertThat(doneJson.get("startedAt").asText()).isEqualTo(startedAt);
        assertThat(doneJson.get("completedAt").isNull()).isFalse();

        // Move back to TODO -> completedAt is cleared, startedAt is preserved
        String moveBackToTodo = String.format("""
                {
                  "version": 2,
                  "move": {
                    "columnId": %d,
                    "afterTaskId": null
                  }
                }
                """, todoColumn.getId());
        ResponseEntity<String> backRes = restTemplate.exchange(
                "/api/tasks/" + taskId, HttpMethod.PATCH,
                new HttpEntity<>(moveBackToTodo, authHeaders(memberToken)), String.class
        );
        JsonNode backJson = objectMapper.readTree(backRes.getBody());
        assertThat(backJson.get("startedAt").asText()).isEqualTo(startedAt);
        assertThat(backJson.get("completedAt").isNull()).isTrue();
    }
}

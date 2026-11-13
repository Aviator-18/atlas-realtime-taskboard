package com.atlas.realtime;

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
import com.atlas.task.service.TaskService;
import com.atlas.task.web.CreateTaskRequest;
import com.atlas.task.web.TaskResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.lang.reflect.Type;
import java.time.Instant;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class RealtimeIntegrationTests {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void configureDatasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @LocalServerPort
    private int port;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BoardRepository boardRepository;

    @Autowired
    private BoardMemberRepository boardMemberRepository;

    @Autowired
    private BoardColumnRepository boardColumnRepository;

    @Autowired
    private com.atlas.task.persistence.TaskRepository taskRepository;

    @Autowired
    private TaskService taskService;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    private UserEntity memberUser;
    private UserEntity nonMemberUser;
    private String memberToken;
    private String nonMemberToken;
    private BoardEntity board;
    private BoardColumnEntity todoColumn;

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
    }

    private WebSocketStompClient createStompClient() {
        WebSocketStompClient stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        MappingJackson2MessageConverter converter = new MappingJackson2MessageConverter();
        converter.setObjectMapper(objectMapper);
        stompClient.setMessageConverter(converter);
        return stompClient;
    }

    private StompSession connectWithToken(WebSocketStompClient client, String token, StompSessionHandlerAdapter handler)
            throws ExecutionException, InterruptedException, TimeoutException {
        StompHeaders connectHeaders = new StompHeaders();
        if (token != null) {
            connectHeaders.add("Authorization", "Bearer " + token);
        }
        return client.connectAsync("ws://localhost:" + port + "/ws", new WebSocketHttpHeaders(), connectHeaders, handler)
                .get(5, TimeUnit.SECONDS);
    }

    @Test
    void an_event_is_delivered_to_a_subscribed_member_after_a_commit() throws Exception {
        WebSocketStompClient client = createStompClient();
        BlockingQueue<BoardEventEnvelope> receivedEvents = new LinkedBlockingQueue<>();

        StompSession session = connectWithToken(client, memberToken, new StompSessionHandlerAdapter() {});

        session.subscribe("/topic/boards/" + board.getId(), new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return BoardEventEnvelope.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                receivedEvents.offer((BoardEventEnvelope) payload);
            }
        });

        // Create a task using TaskService inside a committing transaction
        CreateTaskRequest request = new CreateTaskRequest(todoColumn.getId(), "Deploy payment webhook", "Handle retries", BigDecimal.valueOf(4.0), null, null, null);
        TaskResponse created = taskService.createTask(board.getId(), request, memberUser.getId());

        BoardEventEnvelope envelope = receivedEvents.poll(5, TimeUnit.SECONDS);

        assertThat(envelope).isNotNull();
        assertThat(envelope.type()).isEqualTo("TASK_CREATED");
        assertThat(envelope.boardId()).isEqualTo(board.getId());
        assertThat(envelope.actorId()).isEqualTo(memberUser.getId());
        assertThat(envelope.task()).isNotNull();
        assertThat(envelope.task().id()).isEqualTo(created.id());
        assertThat(envelope.task().title()).isEqualTo("Deploy payment webhook");

        session.disconnect();
        client.stop();
    }

    @Test
    void nothing_is_delivered_after_a_rolled_back_transaction() throws Exception {
        WebSocketStompClient client = createStompClient();
        BlockingQueue<BoardEventEnvelope> receivedEvents = new LinkedBlockingQueue<>();

        StompSession session = connectWithToken(client, memberToken, new StompSessionHandlerAdapter() {});

        session.subscribe("/topic/boards/" + board.getId(), new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return BoardEventEnvelope.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                receivedEvents.offer((BoardEventEnvelope) payload);
            }
        });

        // Publish event inside a rolled-back transaction
        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);
        txTemplate.execute(status -> {
            TaskResponse dummyTask = new TaskResponse(
                    999L, board.getId(), todoColumn.getId(), "Rolled back task", "",
                    1024, null, "MEDIUM", null, null, 0L, memberUser.getId(),
                    Instant.now(), Instant.now(), null, null
            );
            eventPublisher.publishEvent(new TaskCreatedDomainEvent(board.getId(), memberUser.getId(), Instant.now(), dummyTask));
            status.setRollbackOnly();
            return null;
        });

        BoardEventEnvelope envelope = receivedEvents.poll(1, TimeUnit.SECONDS);
        assertThat(envelope).isNull();

        session.disconnect();
        client.stop();
    }

    @Test
    void a_non_member_subscription_is_rejected() throws Exception {
        WebSocketStompClient client = createStompClient();
        CompletableFuture<Throwable> errorFuture = new CompletableFuture<>();

        StompSession session = connectWithToken(client, nonMemberToken, new StompSessionHandlerAdapter() {
            @Override
            public void handleException(StompSession s, StompCommand command, StompHeaders headers, byte[] payload, Throwable exception) {
                errorFuture.complete(exception != null ? exception : new RuntimeException("STOMP error: " + headers.getFirst("message")));
            }

            @Override
            public void handleTransportError(StompSession s, Throwable exception) {
                errorFuture.complete(exception);
            }
        });

        session.subscribe("/topic/boards/" + board.getId(), new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return BoardEventEnvelope.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {}
        });

        Throwable thrown = errorFuture.get(5, TimeUnit.SECONDS);
        assertThat(thrown).isNotNull();

        client.stop();
    }

    @Test
    void an_unauthenticated_connection_is_rejected() {
        WebSocketStompClient client = createStompClient();

        assertThatThrownBy(() -> {
            connectWithToken(client, null, new StompSessionHandlerAdapter() {});
        }).isInstanceOf(ExecutionException.class);

        client.stop();
    }
}

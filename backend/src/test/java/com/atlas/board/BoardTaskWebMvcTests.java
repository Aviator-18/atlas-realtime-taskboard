package com.atlas.board;

import com.atlas.auth.service.AuthService;
import com.atlas.board.service.BoardNotFoundException;
import com.atlas.board.service.BoardService;
import com.atlas.board.service.InvalidInviteCodeException;
import com.atlas.board.web.BoardController;
import com.atlas.board.web.BoardDetailResponse;
import com.atlas.board.web.BoardSummaryResponse;
import com.atlas.common.CommonConfig;
import com.atlas.common.GlobalExceptionHandler;
import com.atlas.common.JwtProperties;
import com.atlas.common.NotAMemberException;
import com.atlas.common.RestAuthenticationEntryPoint;
import com.atlas.common.SecurityConfig;
import com.atlas.task.service.TaskNotFoundException;
import com.atlas.task.service.TaskPatchParser;
import com.atlas.task.service.TaskReadService;
import com.atlas.task.service.TaskService;
import com.atlas.task.service.TaskVersionConflictException;
import com.atlas.task.web.CreateTaskRequest;
import com.atlas.task.web.TaskController;
import com.atlas.task.web.TaskResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {BoardController.class, TaskController.class})
@Import({
        SecurityConfig.class,
        JwtProperties.class,
        RestAuthenticationEntryPoint.class,
        GlobalExceptionHandler.class,
        CommonConfig.class,
        TaskPatchParser.class
})
@ActiveProfiles("dev")
class BoardTaskWebMvcTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private BoardService boardService;

    @MockBean
    private TaskService taskService;

    @MockBean
    private TaskReadService taskReadService;

    @MockBean
    private AuthService authService;

    @Test
    void get_boards_returns_200_for_authenticated_user() throws Exception {
        when(boardService.listUserBoards(1L)).thenReturn(List.of(
                new BoardSummaryResponse(1L, "Checkout API", "OWNER", 3, null)
        ));

        mockMvc.perform(get("/api/boards")
                        .with(jwt().jwt(j -> j.subject("1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].name").value("Checkout API"))
                .andExpect(jsonPath("$[0].role").value("OWNER"))
                .andExpect(jsonPath("$[0].memberCount").value(3));
    }

    @Test
    void create_board_returns_201_with_invite_code() throws Exception {
        when(boardService.createBoard(eq("Checkout API"), eq(1L)))
                .thenReturn(new BoardSummaryResponse(1L, "Checkout API", "OWNER", 1, "K7M2QX9R"));

        mockMvc.perform(post("/api/boards")
                        .with(jwt().jwt(j -> j.subject("1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Checkout API\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.role").value("OWNER"))
                .andExpect(jsonPath("$.inviteCode").value("K7M2QX9R"));
    }

    @Test
    void join_board_returns_200_or_404_on_invalid_code() throws Exception {
        when(boardService.joinBoard(eq("K7M2QX9R"), eq(2L)))
                .thenReturn(new BoardSummaryResponse(1L, "Checkout API", "MEMBER", 2, "K7M2QX9R"));
        when(boardService.joinBoard(eq("BADCODE1"), eq(2L)))
                .thenThrow(new InvalidInviteCodeException("Invalid invite code: BADCODE1"));

        mockMvc.perform(post("/api/boards/join")
                        .with(jwt().jwt(j -> j.subject("2")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"inviteCode\":\"K7M2QX9R\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.role").value("MEMBER"));

        mockMvc.perform(post("/api/boards/join")
                        .with(jwt().jwt(j -> j.subject("2")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"inviteCode\":\"BADCODE1\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("INVALID_INVITE_CODE"));
    }

    @Test
    void get_board_detail_returns_403_for_non_member() throws Exception {
        when(boardService.getBoardDetail(1L, 99L))
                .thenThrow(new NotAMemberException("Not a member"));

        mockMvc.perform(get("/api/boards/1")
                        .with(jwt().jwt(j -> j.subject("99"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_A_MEMBER"));
    }

    @Test
    void create_task_returns_201_for_member() throws Exception {
        TaskResponse res = new TaskResponse(
                7L, 1L, 2L, "Add idempotency", "", 1024,
                new BigDecimal("4.0"), "HIGH", null, null, 0L, 1L,
                Instant.now(), Instant.now(), null, null
        );

        when(taskService.createTask(eq(1L), any(CreateTaskRequest.class), eq(1L))).thenReturn(res);

        mockMvc.perform(post("/api/boards/1/tasks")
                        .with(jwt().jwt(j -> j.subject("1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "columnId": 2,
                                  "title": "Add idempotency",
                                  "estimateHours": 4.0,
                                  "priority": "HIGH"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.version").value(0));
    }

    @Test
    void patch_task_rejects_unknown_fields_with_validation_failed() throws Exception {
        mockMvc.perform(patch("/api/tasks/7")
                        .with(jwt().jwt(j -> j.subject("1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "version": 1,
                                  "unknownProperty": "bar"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors[0].field").value("unknownProperty"));
    }

    @Test
    void patch_task_returns_409_task_version_conflict_when_stale() throws Exception {
        TaskResponse current = new TaskResponse(
                7L, 1L, 2L, "Current title", "", 1024,
                null, "MEDIUM", null, null, 4L, 1L,
                Instant.now(), Instant.now(), null, null
        );

        when(taskService.patchTask(eq(7L), any(), eq(1L)))
                .thenThrow(new TaskVersionConflictException(current));

        mockMvc.perform(patch("/api/tasks/7")
                        .with(jwt().jwt(j -> j.subject("1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "version": 2,
                                  "title": "Stale edit"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TASK_VERSION_CONFLICT"))
                .andExpect(jsonPath("$.currentTask.id").value(7))
                .andExpect(jsonPath("$.currentTask.version").value(4));
    }

    @Test
    void delete_task_requires_version_param_and_returns_409_on_stale() throws Exception {
        TaskResponse current = new TaskResponse(
                7L, 1L, 2L, "Title", "", 1024,
                null, "MEDIUM", null, null, 4L, 1L,
                Instant.now(), Instant.now(), null, null
        );

        doThrow(new TaskVersionConflictException(current))
                .when(taskService).deleteTask(7L, 2L, 1L);

        // Version param missing
        mockMvc.perform(delete("/api/tasks/7")
                        .with(jwt().jwt(j -> j.subject("1"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

        // Stale version
        mockMvc.perform(delete("/api/tasks/7?version=2")
                        .with(jwt().jwt(j -> j.subject("1"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TASK_VERSION_CONFLICT"))
                .andExpect(jsonPath("$.currentTask.version").value(4));

        // Matching version
        mockMvc.perform(delete("/api/tasks/7?version=4")
                        .with(jwt().jwt(j -> j.subject("1"))))
                .andExpect(status().isNoContent());

        verify(taskService).deleteTask(7L, 4L, 1L);
    }
}

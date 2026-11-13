package com.atlas.task.service;

import com.atlas.common.JsonPatchValidationException;
import com.atlas.task.persistence.Priority;
import com.atlas.task.web.TaskPatchValues;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TaskPatchParserTest {

    private TaskPatchParser parser;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        parser = new TaskPatchParser();
        objectMapper = new ObjectMapper();
    }

    @Test
    void parses_valid_patch_with_all_fields() throws Exception {
        String json = """
                {
                  "version": 3,
                  "title": "Fix refund rounding",
                  "description": "Updated description",
                  "estimateHours": 4.5,
                  "priority": "HIGH",
                  "assigneeId": 12,
                  "move": {
                    "columnId": 2,
                    "afterTaskId": 9
                  }
                }
                """;

        TaskPatchValues patch = parser.parse(objectMapper.readTree(json));

        assertThat(patch.version()).isEqualTo(3L);
        assertThat(patch.hasTitle()).isTrue();
        assertThat(patch.title()).isEqualTo("Fix refund rounding");
        assertThat(patch.hasDescription()).isTrue();
        assertThat(patch.description()).isEqualTo("Updated description");
        assertThat(patch.hasEstimateHours()).isTrue();
        assertThat(patch.estimateHours()).isEqualByComparingTo(new BigDecimal("4.5"));
        assertThat(patch.hasPriority()).isTrue();
        assertThat(patch.priority()).isEqualTo(Priority.HIGH);
        assertThat(patch.hasAssigneeId()).isTrue();
        assertThat(patch.assigneeId()).isEqualTo(12L);
        assertThat(patch.hasMove()).isTrue();
        assertThat(patch.move().columnId()).isEqualTo(2L);
        assertThat(patch.move().afterTaskId()).isEqualTo(9L);
    }

    @Test
    void rejects_missing_version() throws Exception {
        String json = """
                {
                  "title": "Only title"
                }
                """;

        assertThatThrownBy(() -> parser.parse(objectMapper.readTree(json)))
                .isInstanceOf(JsonPatchValidationException.class)
                .satisfies(ex -> {
                    JsonPatchValidationException jpe = (JsonPatchValidationException) ex;
                    assertThat(jpe.getErrors()).anyMatch(e -> e.field().equals("version"));
                });
    }

    @Test
    void rejects_unknown_top_level_fields() throws Exception {
        String json = """
                {
                  "version": 1,
                  "extraField": "customPayload",
                  "status": "DONE"
                }
                """;

        assertThatThrownBy(() -> parser.parse(objectMapper.readTree(json)))
                .isInstanceOf(JsonPatchValidationException.class)
                .satisfies(ex -> {
                    JsonPatchValidationException jpe = (JsonPatchValidationException) ex;
                    assertThat(jpe.getErrors()).anyMatch(e -> e.field().equals("extraField"));
                    assertThat(jpe.getErrors()).anyMatch(e -> e.field().equals("status"));
                });
    }

    @Test
    void supports_explicit_null_for_estimate_and_assignee() throws Exception {
        String json = """
                {
                  "version": 2,
                  "estimateHours": null,
                  "assigneeId": null
                }
                """;

        TaskPatchValues patch = parser.parse(objectMapper.readTree(json));

        assertThat(patch.hasEstimateHours()).isTrue();
        assertThat(patch.estimateHours()).isNull();
        assertThat(patch.hasAssigneeId()).isTrue();
        assertThat(patch.assigneeId()).isNull();
    }

    @Test
    void rejects_null_for_title_and_priority() throws Exception {
        String json = """
                {
                  "version": 1,
                  "title": null,
                  "priority": null
                }
                """;

        assertThatThrownBy(() -> parser.parse(objectMapper.readTree(json)))
                .isInstanceOf(JsonPatchValidationException.class)
                .satisfies(ex -> {
                    JsonPatchValidationException jpe = (JsonPatchValidationException) ex;
                    assertThat(jpe.getErrors()).anyMatch(e -> e.field().equals("title"));
                    assertThat(jpe.getErrors()).anyMatch(e -> e.field().equals("priority"));
                });
    }

    @Test
    void rejects_out_of_range_estimate_hours() throws Exception {
        String json = """
                {
                  "version": 1,
                  "estimateHours": 45.0
                }
                """;

        assertThatThrownBy(() -> parser.parse(objectMapper.readTree(json)))
                .isInstanceOf(JsonPatchValidationException.class)
                .satisfies(ex -> {
                    JsonPatchValidationException jpe = (JsonPatchValidationException) ex;
                    assertThat(jpe.getErrors()).anyMatch(e -> e.field().equals("estimateHours"));
                });
    }

    @Test
    void rejects_unknown_fields_inside_move() throws Exception {
        String json = """
                {
                  "version": 1,
                  "move": {
                    "columnId": 3,
                    "unknownMoveField": "bad"
                  }
                }
                """;

        assertThatThrownBy(() -> parser.parse(objectMapper.readTree(json)))
                .isInstanceOf(JsonPatchValidationException.class)
                .satisfies(ex -> {
                    JsonPatchValidationException jpe = (JsonPatchValidationException) ex;
                    assertThat(jpe.getErrors()).anyMatch(e -> e.field().equals("move.unknownMoveField"));
                });
    }

    @Test
    void supports_move_to_top_with_null_after_task_id() throws Exception {
        String json = """
                {
                  "version": 1,
                  "move": {
                    "columnId": 3,
                    "afterTaskId": null
                  }
                }
                """;

        TaskPatchValues patch = parser.parse(objectMapper.readTree(json));

        assertThat(patch.hasMove()).isTrue();
        assertThat(patch.move().columnId()).isEqualTo(3L);
        assertThat(patch.move().afterTaskId()).isNull();
    }
}

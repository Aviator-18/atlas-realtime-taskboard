package com.atlas.task.service;

import com.atlas.common.FieldErrorDetail;
import com.atlas.common.JsonPatchValidationException;
import com.atlas.task.persistence.Priority;
import com.atlas.task.web.TaskMoveValues;
import com.atlas.task.web.TaskPatchValues;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;
import java.util.Set;

@Component
public class TaskPatchParser {

    private static final Set<String> ALLOWED_TOP_FIELDS = Set.of(
            "version", "title", "description", "estimateHours", "priority", "assigneeId", "move"
    );

    private static final Set<String> ALLOWED_MOVE_FIELDS = Set.of(
            "columnId", "afterTaskId"
    );

    public TaskPatchValues parse(JsonNode root) {
        List<FieldErrorDetail> errors = new ArrayList<>();

        if (root == null || !root.isObject()) {
            errors.add(new FieldErrorDetail("body", "Request body must be a JSON object"));
            throw new JsonPatchValidationException(errors);
        }

        Iterator<String> fieldNames = root.fieldNames();
        while (fieldNames.hasNext()) {
            String field = fieldNames.next();
            if (!ALLOWED_TOP_FIELDS.contains(field)) {
                errors.add(new FieldErrorDetail(field, "Unknown field: " + field));
            }
        }

        Long version = null;
        if (!root.has("version")) {
            errors.add(new FieldErrorDetail("version", "version is required"));
        } else {
            JsonNode versionNode = root.get("version");
            if (!versionNode.isIntegralNumber()) {
                errors.add(new FieldErrorDetail("version", "version must be an integer"));
            } else {
                version = versionNode.asLong();
            }
        }

        boolean hasTitle = root.has("title");
        String title = null;
        if (hasTitle) {
            JsonNode titleNode = root.get("title");
            if (titleNode.isNull() || !titleNode.isTextual()) {
                errors.add(new FieldErrorDetail("title", "title must be a non-null string"));
            } else {
                title = titleNode.asText();
                if (title.isEmpty() || title.length() > 120) {
                    errors.add(new FieldErrorDetail("title", "title must be between 1 and 120 characters"));
                }
            }
        }

        boolean hasDescription = root.has("description");
        String description = null;
        if (hasDescription) {
            JsonNode descNode = root.get("description");
            if (descNode.isNull() || !descNode.isTextual()) {
                errors.add(new FieldErrorDetail("description", "description must be a non-null string"));
            } else {
                description = descNode.asText();
                if (description.length() > 4000) {
                    errors.add(new FieldErrorDetail("description", "description cannot exceed 4000 characters"));
                }
            }
        }

        boolean hasEstimateHours = root.has("estimateHours");
        BigDecimal estimateHours = null;
        if (hasEstimateHours) {
            JsonNode estNode = root.get("estimateHours");
            if (estNode.isNull()) {
                estimateHours = null;
            } else if (!estNode.isNumber()) {
                errors.add(new FieldErrorDetail("estimateHours", "estimateHours must be a number or null"));
            } else {
                double val = estNode.asDouble();
                if (val < 0.5 || val > 40.0) {
                    errors.add(new FieldErrorDetail("estimateHours", "estimateHours must be between 0.5 and 40.0"));
                } else {
                    estimateHours = BigDecimal.valueOf(val).setScale(1, RoundingMode.HALF_UP);
                }
            }
        }

        boolean hasPriority = root.has("priority");
        Priority priority = null;
        if (hasPriority) {
            JsonNode prioNode = root.get("priority");
            if (prioNode.isNull() || !prioNode.isTextual()) {
                errors.add(new FieldErrorDetail("priority", "priority must be LOW, MEDIUM, or HIGH"));
            } else {
                try {
                    priority = Priority.valueOf(prioNode.asText());
                } catch (IllegalArgumentException e) {
                    errors.add(new FieldErrorDetail("priority", "priority must be LOW, MEDIUM, or HIGH"));
                }
            }
        }

        boolean hasAssigneeId = root.has("assigneeId");
        Long assigneeId = null;
        if (hasAssigneeId) {
            JsonNode assNode = root.get("assigneeId");
            if (assNode.isNull()) {
                assigneeId = null;
            } else if (!assNode.isIntegralNumber()) {
                errors.add(new FieldErrorDetail("assigneeId", "assigneeId must be an integer or null"));
            } else {
                assigneeId = assNode.asLong();
            }
        }

        boolean hasMove = root.has("move");
        TaskMoveValues moveValues = null;
        if (hasMove) {
            JsonNode moveNode = root.get("move");
            if (moveNode.isNull() || !moveNode.isObject()) {
                errors.add(new FieldErrorDetail("move", "move must be a non-null object"));
            } else {
                Iterator<String> moveFieldNames = moveNode.fieldNames();
                while (moveFieldNames.hasNext()) {
                    String moveField = moveFieldNames.next();
                    if (!ALLOWED_MOVE_FIELDS.contains(moveField)) {
                        errors.add(new FieldErrorDetail("move." + moveField, "Unknown field: " + moveField));
                    }
                }

                Long columnId = null;
                if (!moveNode.has("columnId") || !moveNode.get("columnId").isIntegralNumber()) {
                    errors.add(new FieldErrorDetail("move.columnId", "move.columnId is required and must be an integer"));
                } else {
                    columnId = moveNode.get("columnId").asLong();
                }

                Long afterTaskId = null;
                if (moveNode.has("afterTaskId")) {
                    JsonNode afterNode = moveNode.get("afterTaskId");
                    if (afterNode.isNull()) {
                        afterTaskId = null;
                    } else if (!afterNode.isIntegralNumber()) {
                        errors.add(new FieldErrorDetail("move.afterTaskId", "move.afterTaskId must be an integer or null"));
                    } else {
                        afterTaskId = afterNode.asLong();
                    }
                }

                if (columnId != null) {
                    moveValues = new TaskMoveValues(columnId, afterTaskId);
                }
            }
        }

        if (!errors.isEmpty()) {
            errors.sort(Comparator.comparing(FieldErrorDetail::field));
            throw new JsonPatchValidationException(errors);
        }

        return new TaskPatchValues(
                version,
                hasTitle,
                title,
                hasDescription,
                description,
                hasEstimateHours,
                estimateHours,
                hasPriority,
                priority,
                hasAssigneeId,
                assigneeId,
                hasMove,
                moveValues
        );
    }
}

package com.atlas.common;

import com.atlas.auth.service.DuplicateEmailException;
import com.atlas.auth.service.InvalidCredentialsException;
import com.atlas.board.service.BoardNotFoundException;
import com.atlas.board.service.ColumnNotFoundException;
import com.atlas.board.service.InvalidInviteCodeException;
import com.atlas.estimation.service.EstimationRateLimitedException;
import com.atlas.task.service.TaskNotFoundException;
import com.atlas.task.service.TaskReadService;
import com.atlas.task.service.TaskVersionConflictException;
import com.atlas.task.web.TaskResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private static final String PROBLEM_BASE_URL = "https://atlas.local/problems/";

    private final TaskReadService taskReadService;

    public GlobalExceptionHandler(TaskReadService taskReadService) {
        this.taskReadService = taskReadService;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(MethodArgumentNotValidException ex) {
        List<FieldErrorDetail> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> new FieldErrorDetail(err.getField(), err.getDefaultMessage()))
                .sorted(Comparator.comparing(FieldErrorDetail::field))
                .toList();

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "Input validation failed"
        );
        problem.setType(URI.create(PROBLEM_BASE_URL + "validation-failed"));
        problem.setTitle("Validation failed");
        problem.setProperty("code", "VALIDATION_FAILED");
        problem.setProperty("errors", fieldErrors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ProblemDetail> handleMissingParam(MissingServletRequestParameterException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "Required parameter '" + ex.getParameterName() + "' is missing"
        );
        problem.setType(URI.create(PROBLEM_BASE_URL + "validation-failed"));
        problem.setTitle("Validation failed");
        problem.setProperty("code", "VALIDATION_FAILED");
        problem.setProperty("errors", List.of(new FieldErrorDetail(ex.getParameterName(), "Parameter is required")));

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler(JsonPatchValidationException.class)
    public ResponseEntity<ProblemDetail> handleJsonPatchValidation(JsonPatchValidationException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "Input validation failed"
        );
        problem.setType(URI.create(PROBLEM_BASE_URL + "validation-failed"));
        problem.setTitle("Validation failed");
        problem.setProperty("code", "VALIDATION_FAILED");
        problem.setProperty("errors", ex.getErrors());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ProblemDetail> handleIllegalArgument(IllegalArgumentException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                ex.getMessage() != null ? ex.getMessage() : "Invalid argument"
        );
        problem.setType(URI.create(PROBLEM_BASE_URL + "validation-failed"));
        problem.setTitle("Validation failed");
        problem.setProperty("code", "VALIDATION_FAILED");
        problem.setProperty("errors", List.of(new FieldErrorDetail("request", ex.getMessage())));

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemDetail> handleMalformedBody(HttpMessageNotReadableException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "Malformed request body"
        );
        problem.setType(URI.create(PROBLEM_BASE_URL + "validation-failed"));
        problem.setTitle("Validation failed");
        problem.setProperty("code", "VALIDATION_FAILED");
        problem.setProperty("errors", List.of());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ProblemDetail> handleDuplicateEmail(DuplicateEmailException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT,
                ex.getMessage()
        );
        problem.setType(URI.create(PROBLEM_BASE_URL + "email-taken"));
        problem.setTitle("Email already taken");
        problem.setProperty("code", "EMAIL_TAKEN");

        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ProblemDetail> handleInvalidCredentials(InvalidCredentialsException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNAUTHORIZED,
                ex.getMessage()
        );
        problem.setType(URI.create(PROBLEM_BASE_URL + "invalid-credentials"));
        problem.setTitle("Invalid credentials");
        problem.setProperty("code", "INVALID_CREDENTIALS");

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(problem);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ProblemDetail> handleAuthentication(AuthenticationException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNAUTHORIZED,
                "Missing, expired or invalid token"
        );
        problem.setType(URI.create(PROBLEM_BASE_URL + "unauthenticated"));
        problem.setTitle("Unauthenticated");
        problem.setProperty("code", "UNAUTHENTICATED");

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(problem);
    }

    @ExceptionHandler({AccessDeniedException.class, NotAMemberException.class})
    public ResponseEntity<ProblemDetail> handleAccessDenied(Exception ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN,
                "User is not a member of this board"
        );
        problem.setType(URI.create(PROBLEM_BASE_URL + "not-a-member"));
        problem.setTitle("Not a member");
        problem.setProperty("code", "NOT_A_MEMBER");

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(problem);
    }

    @ExceptionHandler(BoardNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleBoardNotFound(BoardNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND,
                ex.getMessage()
        );
        problem.setType(URI.create(PROBLEM_BASE_URL + "board-not-found"));
        problem.setTitle("Board not found");
        problem.setProperty("code", "BOARD_NOT_FOUND");

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }

    @ExceptionHandler(TaskNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleTaskNotFound(TaskNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND,
                ex.getMessage()
        );
        problem.setType(URI.create(PROBLEM_BASE_URL + "task-not-found"));
        problem.setTitle("Task not found");
        problem.setProperty("code", "TASK_NOT_FOUND");

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }

    @ExceptionHandler(ColumnNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleColumnNotFound(ColumnNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND,
                ex.getMessage()
        );
        problem.setType(URI.create(PROBLEM_BASE_URL + "column-not-found"));
        problem.setTitle("Column not found");
        problem.setProperty("code", "COLUMN_NOT_FOUND");

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }

    @ExceptionHandler(InvalidInviteCodeException.class)
    public ResponseEntity<ProblemDetail> handleInvalidInviteCode(InvalidInviteCodeException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND,
                ex.getMessage()
        );
        problem.setType(URI.create(PROBLEM_BASE_URL + "invalid-invite-code"));
        problem.setTitle("Invalid invite code");
        problem.setProperty("code", "INVALID_INVITE_CODE");

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }

    @ExceptionHandler(EstimationRateLimitedException.class)
    public ResponseEntity<ProblemDetail> handleEstimationRateLimited(EstimationRateLimitedException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.TOO_MANY_REQUESTS,
                "Too many suggestions in a short time. Try again in a minute."
        );
        problem.setType(URI.create(PROBLEM_BASE_URL + "estimation-rate-limited"));
        problem.setTitle("Estimation rate limit exceeded");
        problem.setProperty("code", "ESTIMATION_RATE_LIMITED");

        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(problem);
    }

    @ExceptionHandler(TaskVersionConflictException.class)
    public ResponseEntity<ProblemDetail> handleTaskVersionConflict(TaskVersionConflictException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT,
                "Another member saved this task first."
        );
        problem.setType(URI.create(PROBLEM_BASE_URL + "task-version-conflict"));
        problem.setTitle("Task changed since you loaded it");
        problem.setProperty("code", "TASK_VERSION_CONFLICT");
        problem.setProperty("currentTask", ex.getCurrentTask());

        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ProblemDetail> handleOptimisticLockFailure(ObjectOptimisticLockingFailureException ex) {
        TaskResponse currentTask = null;
        if (ex.getIdentifier() != null) {
            try {
                Long id = Long.valueOf(ex.getIdentifier().toString());
                currentTask = taskReadService.getCurrentTaskById(id).orElse(null);
            } catch (Exception e) {
                log.warn("Could not reload task state for optimistic locking failure: {}", ex.getIdentifier(), e);
            }
        }

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT,
                "Another member saved this task first."
        );
        problem.setType(URI.create(PROBLEM_BASE_URL + "task-version-conflict"));
        problem.setTitle("Task changed since you loaded it");
        problem.setProperty("code", "TASK_VERSION_CONFLICT");
        problem.setProperty("currentTask", currentTask);

        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleUnexpected(Exception ex) {
        String errorId = UUID.randomUUID().toString();
        log.error("Internal server error [errorId={}]", errorId, ex);

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected error occurred"
        );
        problem.setType(URI.create(PROBLEM_BASE_URL + "internal-error"));
        problem.setTitle("Internal server error");
        problem.setProperty("code", "INTERNAL_SERVER_ERROR");

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problem);
    }
}

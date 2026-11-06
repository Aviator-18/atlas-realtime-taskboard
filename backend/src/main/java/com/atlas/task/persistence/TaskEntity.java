package com.atlas.task.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "tasks")
public class TaskEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "board_id", nullable = false)
    private Long boardId;

    @Column(name = "column_id", nullable = false)
    private Long columnId;

    @Column(name = "title", nullable = false, length = 120)
    private String title;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "position", nullable = false)
    private Integer position;

    @Column(name = "assignee_id")
    private Long assigneeId;

    @Column(name = "estimate_hours", precision = 4, scale = 1)
    private BigDecimal estimateHours;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 6)
    private Priority priority;

    @Column(name = "ai_rationale", length = 200)
    private String aiRationale;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    protected TaskEntity() {
        // JPA constructor
    }

    public TaskEntity(Long boardId,
                      Long columnId,
                      String title,
                      String description,
                      Integer position,
                      Long assigneeId,
                      BigDecimal estimateHours,
                      Priority priority,
                      String aiRationale,
                      Long createdBy,
                      Instant createdAt,
                      Instant updatedAt,
                      Instant startedAt,
                      Instant completedAt) {
        this.boardId = boardId;
        this.columnId = columnId;
        this.title = title;
        this.description = description != null ? description : "";
        this.position = position;
        this.assigneeId = assigneeId;
        this.estimateHours = estimateHours;
        this.priority = priority != null ? priority : Priority.MEDIUM;
        this.aiRationale = aiRationale;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.startedAt = startedAt;
        this.completedAt = completedAt;
        this.version = 0L;
    }

    public Long getId() {
        return id;
    }

    public Long getBoardId() {
        return boardId;
    }

    public void setBoardId(Long boardId) {
        this.boardId = boardId;
    }

    public Long getColumnId() {
        return columnId;
    }

    public void setColumnId(Long columnId) {
        this.columnId = columnId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description != null ? description : "";
    }

    public Integer getPosition() {
        return position;
    }

    public void setPosition(Integer position) {
        this.position = position;
    }

    public Long getAssigneeId() {
        return assigneeId;
    }

    public void setAssigneeId(Long assigneeId) {
        this.assigneeId = assigneeId;
    }

    public BigDecimal getEstimateHours() {
        return estimateHours;
    }

    public void setEstimateHours(BigDecimal estimateHours) {
        this.estimateHours = estimateHours;
    }

    public Priority getPriority() {
        return priority;
    }

    public void setPriority(Priority priority) {
        this.priority = priority;
    }

    public String getAiRationale() {
        return aiRationale;
    }

    public void setAiRationale(String aiRationale) {
        this.aiRationale = aiRationale;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TaskEntity that = (TaskEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}

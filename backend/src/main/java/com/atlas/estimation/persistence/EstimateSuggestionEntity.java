package com.atlas.estimation.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "estimate_suggestions")
public class EstimateSuggestionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "board_id", nullable = false)
    private Long boardId;

    @Column(name = "requested_by", nullable = false)
    private Long requestedBy;

    @Column(name = "source", nullable = false, length = 8)
    private String source;

    @Column(name = "suggested_hours", nullable = false, precision = 4, scale = 1)
    private BigDecimal suggestedHours;

    @Column(name = "suggested_priority", nullable = false, length = 6)
    private String suggestedPriority;

    @Column(name = "latency_ms", nullable = false)
    private Integer latencyMs;

    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", nullable = false, length = 10)
    private EstimateSuggestionOutcome outcome;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected EstimateSuggestionEntity() {
        // JPA constructor
    }

    public EstimateSuggestionEntity(Long boardId,
                                  Long requestedBy,
                                  String source,
                                  BigDecimal suggestedHours,
                                  String suggestedPriority,
                                  Integer latencyMs,
                                  EstimateSuggestionOutcome outcome,
                                  Instant createdAt) {
        this.boardId = boardId;
        this.requestedBy = requestedBy;
        this.source = source;
        this.suggestedHours = suggestedHours;
        this.suggestedPriority = suggestedPriority;
        this.latencyMs = latencyMs;
        this.outcome = outcome;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public Long getBoardId() {
        return boardId;
    }

    public Long getRequestedBy() {
        return requestedBy;
    }

    public String getSource() {
        return source;
    }

    public BigDecimal getSuggestedHours() {
        return suggestedHours;
    }

    public String getSuggestedPriority() {
        return suggestedPriority;
    }

    public Integer getLatencyMs() {
        return latencyMs;
    }

    public EstimateSuggestionOutcome getOutcome() {
        return outcome;
    }

    public void setOutcome(EstimateSuggestionOutcome outcome) {
        this.outcome = outcome;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        EstimateSuggestionEntity that = (EstimateSuggestionEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}

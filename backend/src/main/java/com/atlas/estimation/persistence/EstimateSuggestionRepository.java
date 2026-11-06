package com.atlas.estimation.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EstimateSuggestionRepository extends JpaRepository<EstimateSuggestionEntity, Long> {
}

package com.atlas.estimation.web;

import com.atlas.estimation.service.EstimationService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class EstimationController {

    private final EstimationService estimationService;

    public EstimationController(EstimationService estimationService) {
        this.estimationService = estimationService;
    }

    @PostMapping("/tasks/estimate")
    public EstimateResponse estimate(@AuthenticationPrincipal Jwt jwt,
                                     @Valid @RequestBody EstimateRequest request) {
        Long userId = Long.valueOf(jwt.getSubject());
        return estimationService.requestEstimate(userId, request);
    }
}

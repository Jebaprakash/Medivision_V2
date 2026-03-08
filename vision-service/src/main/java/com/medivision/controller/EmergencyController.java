package com.medivision.controller;

import com.medivision.service.EmergencyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Emergency Detection REST Controller.
 * Exposes severity classification endpoints for the Node.js gateway.
 */
@RestController
@RequestMapping("/emergency")
@CrossOrigin(origins = "*")
public class EmergencyController {

    private final EmergencyService emergencyService;

    public EmergencyController(EmergencyService emergencyService) {
        this.emergencyService = emergencyService;
    }

    /**
     * POST /emergency/classify — classify severity of a condition.
     */
    @PostMapping("/classify")
    public ResponseEntity<Map<String, Object>> classify(@RequestBody Map<String, Object> request) {
        String condition = (String) request.getOrDefault("condition", "");
        double confidence = request.containsKey("confidence")
                ? ((Number) request.get("confidence")).doubleValue()
                : 0.0;

        Map<String, Object> result = emergencyService.classifySeverity(condition, confidence);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /emergency/severe-conditions — list all severe conditions.
     */
    @GetMapping("/severe-conditions")
    public ResponseEntity<?> getSevereConditions() {
        return ResponseEntity.ok(Map.of("conditions", emergencyService.getSevereConditions()));
    }
}

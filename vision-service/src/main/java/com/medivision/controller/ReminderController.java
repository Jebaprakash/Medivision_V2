package com.medivision.controller;

import com.medivision.service.ReminderSchedulerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Reminder Scheduler REST Controller.
 * Exposes reminder scheduling logic via REST for the Node.js gateway.
 */
@RestController
@RequestMapping("/reminders")
@CrossOrigin(origins = "*")
public class ReminderController {

    private final ReminderSchedulerService schedulerService;

    public ReminderController(ReminderSchedulerService schedulerService) {
        this.schedulerService = schedulerService;
    }

    /**
     * POST /reminders/check-due — check if a reminder is currently due.
     */
    @PostMapping("/check-due")
    public ResponseEntity<Map<String, Object>> checkDue(@RequestBody Map<String, Object> request) {
        String scheduleTime = (String) request.getOrDefault("scheduleTime", "");
        String frequency = (String) request.getOrDefault("frequency", "daily");
        int tolerance = request.containsKey("toleranceMinutes")
                ? ((Number) request.get("toleranceMinutes")).intValue()
                : 1;

        boolean isDue = schedulerService.isReminderDue(scheduleTime, frequency, tolerance);
        String nextTime = schedulerService.getNextReminderTime(scheduleTime, frequency);

        return ResponseEntity.ok(Map.of(
                "isDue", isDue,
                "nextReminderTime", nextTime
        ));
    }

    /**
     * POST /reminders/validate — validate schedule configuration.
     */
    @SuppressWarnings("unchecked")
    @PostMapping("/validate")
    public ResponseEntity<Map<String, Object>> validate(@RequestBody Map<String, Object> request) {
        String scheduleTime = (String) request.getOrDefault("scheduleTime", "");
        String frequency = (String) request.getOrDefault("frequency", "daily");
        List<String> reminderTimes = (List<String>) request.getOrDefault("reminderTimes", List.of());

        Map<String, Object> result = schedulerService.validateSchedule(scheduleTime, frequency, reminderTimes);
        return ResponseEntity.ok(result);
    }

    /**
     * POST /reminders/format-message — generate formatted reminder message.
     */
    @PostMapping("/format-message")
    public ResponseEntity<Map<String, String>> formatMessage(@RequestBody Map<String, String> request) {
        String name = request.getOrDefault("medicineName", "");
        String dosage = request.getOrDefault("dosage", "");
        String time = request.getOrDefault("scheduleTime", "");

        String message = schedulerService.formatReminderMessage(name, dosage, time);
        return ResponseEntity.ok(Map.of("message", message));
    }
}

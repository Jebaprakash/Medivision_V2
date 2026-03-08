package com.medivision.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Reminder Scheduler Service — handles scheduling logic for medicine reminders.
 * Determines which reminders are due, manages frequency calculations,
 * and provides the next reminder time.
 */
@Service
public class ReminderSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(ReminderSchedulerService.class);

    /**
     * Check if a reminder is due now based on its schedule time and frequency.
     *
     * @param scheduleTime the scheduled time (HH:mm format)
     * @param frequency    daily, twice_daily, weekly, etc.
     * @param toleranceMinutes how many minutes of tolerance (e.g. 1 minute)
     * @return true if the reminder should fire now
     */
    public boolean isReminderDue(String scheduleTime, String frequency, int toleranceMinutes) {
        try {
            LocalTime scheduled = LocalTime.parse(scheduleTime, DateTimeFormatter.ofPattern("HH:mm"));
            LocalTime now = LocalTime.now();

            // Check if current time is within tolerance of scheduled time
            long minutesDiff = Math.abs(
                    java.time.Duration.between(scheduled, now).toMinutes()
            );

            if (minutesDiff > toleranceMinutes) {
                return false;
            }

            // For daily frequency, always fire
            if ("daily".equalsIgnoreCase(frequency)) {
                return true;
            }

            // For other frequencies, additional day-of-week checks would go here
            // For MVP, treat all frequencies as daily
            return true;

        } catch (Exception e) {
            log.error("Failed to parse schedule time: {}", scheduleTime, e);
            return false;
        }
    }

    /**
     * Calculate the next reminder time based on current schedule.
     *
     * @param scheduleTime current schedule time
     * @param frequency    reminder frequency
     * @return the next time the reminder should fire (HH:mm format)
     */
    public String getNextReminderTime(String scheduleTime, String frequency) {
        try {
            LocalTime scheduled = LocalTime.parse(scheduleTime, DateTimeFormatter.ofPattern("HH:mm"));
            LocalTime now = LocalTime.now();

            if (now.isBefore(scheduled)) {
                return scheduled.format(DateTimeFormatter.ofPattern("HH:mm"));
            }

            // If past today's time, next occurrence is tomorrow at the same time
            return scheduled.format(DateTimeFormatter.ofPattern("HH:mm")) + " (tomorrow)";
        } catch (Exception e) {
            return scheduleTime;
        }
    }

    /**
     * Generate a formatted reminder message.
     */
    public String formatReminderMessage(String medicineName, String dosage, String scheduleTime) {
        String msg = "Time to take " + medicineName;
        if (dosage != null && !dosage.isEmpty()) {
            msg += " — " + dosage;
        }
        msg += " (scheduled at " + scheduleTime + ")";
        return msg;
    }

    /**
     * Validate reminder schedule configuration.
     */
    public Map<String, Object> validateSchedule(String scheduleTime, String frequency, List<String> reminderTimes) {
        Map<String, Object> validation = new LinkedHashMap<>();
        validation.put("valid", true);
        List<String> errors = new ArrayList<>();

        // Validate time format
        try {
            LocalTime.parse(scheduleTime, DateTimeFormatter.ofPattern("HH:mm"));
        } catch (Exception e) {
            errors.add("Invalid schedule time format. Use HH:mm");
        }

        // Validate frequency
        Set<String> validFrequencies = Set.of("daily", "twice_daily", "weekly", "as_needed");
        if (frequency != null && !validFrequencies.contains(frequency.toLowerCase())) {
            errors.add("Invalid frequency. Use: daily, twice_daily, weekly, or as_needed");
        }

        if (!errors.isEmpty()) {
            validation.put("valid", false);
            validation.put("errors", errors);
        }

        return validation;
    }
}

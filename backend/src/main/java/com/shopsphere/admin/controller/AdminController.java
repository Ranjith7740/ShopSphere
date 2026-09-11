package com.shopsphere.admin.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Placeholder endpoint that exists only to exercise the /api/admin/** authorization
 * rule (ROLE_ADMIN required). Real admin business functionality is out of scope
 * for Step 12 and will be added in later steps.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @GetMapping("/ping")
    public Map<String, String> ping() {
        return Map.of("message", "Admin access confirmed");
    }
}

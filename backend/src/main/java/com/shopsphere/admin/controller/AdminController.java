package com.shopsphere.admin.controller;

import com.shopsphere.user.dto.UserPageResponse;
import com.shopsphere.user.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminUserService adminUserService;

    @GetMapping("/ping")
    public java.util.Map<String, String> ping() {
        return java.util.Map.of("message", "Admin access confirmed");
    }

    @GetMapping("/users")
    public ResponseEntity<UserPageResponse> getUsers(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(adminUserService.getUsers(search, pageable));
    }
}

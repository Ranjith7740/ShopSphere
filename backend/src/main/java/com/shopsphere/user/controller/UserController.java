package com.shopsphere.user.controller;

import com.shopsphere.user.dto.UpdateUserRequest;
import com.shopsphere.user.dto.UserResponse;
import com.shopsphere.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The authenticated user's identity always comes from the SecurityContext
 * (populated by JwtAuthenticationFilter from the JWT subject claim) - never
 * from a client-supplied id, so a user can only ever act on their own profile.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(@AuthenticationPrincipal String email) {
        return ResponseEntity.ok(userService.getCurrentUser(email));
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateCurrentUser(@AuthenticationPrincipal String email,
                                                            @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(userService.updateCurrentUser(email, request));
    }
}

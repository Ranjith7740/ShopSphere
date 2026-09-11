package com.shopsphere.user.dto;

import com.shopsphere.user.entity.Role;
import com.shopsphere.user.entity.User;

/**
 * Safe, outward-facing view of a user. Never includes the password.
 */
public record UserResponse(
        Long id,
        String name,
        String email,
        String phone,
        Role role
) {
    public static UserResponse fromEntity(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole()
        );
    }
}

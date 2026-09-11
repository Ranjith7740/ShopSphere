package com.shopsphere.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Fields a user may update about their own profile.
 * No id, email, role, status or password here by design.
 */
public record UpdateUserRequest(

        @NotBlank(message = "Name is required")
        String name,

        @NotBlank(message = "Phone is required")
        @Pattern(regexp = "^[0-9]{10}$", message = "Phone must be exactly 10 digits")
        String phone
) {
}

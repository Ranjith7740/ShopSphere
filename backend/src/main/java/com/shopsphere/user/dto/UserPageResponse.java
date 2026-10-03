package com.shopsphere.user.dto;

import java.util.List;

public record UserPageResponse(
    List<UserResponse> content,
    int totalPages,
    long totalElements,
    int size,
    int number
) {}

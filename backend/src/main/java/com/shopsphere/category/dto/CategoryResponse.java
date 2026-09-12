package com.shopsphere.category.dto;

import com.shopsphere.category.entity.Category;
import com.shopsphere.category.entity.CategoryStatus;

import java.time.LocalDateTime;

public record CategoryResponse(
        Long id,
        String name,
        String description,
        CategoryStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static CategoryResponse fromEntity(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getDescription(),
                category.getStatus(),
                category.getCreatedAt(),
                category.getUpdatedAt()
        );
    }
}

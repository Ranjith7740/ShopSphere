package com.shopsphere.product.dto;

import org.springframework.data.domain.Page;

import java.util.List;

public record ProductPageResponse(
        List<ProductResponse> data,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
    public static ProductPageResponse fromPage(Page<ProductResponse> page) {
        return new ProductPageResponse(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }
}

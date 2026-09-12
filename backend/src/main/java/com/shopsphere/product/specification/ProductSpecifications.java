package com.shopsphere.product.specification;

import com.shopsphere.product.entity.Product;
import com.shopsphere.product.entity.ProductStatus;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * A single dynamic Specification instead of a JpaRepository method per filter
 * combination (findByNameAndCategory, findByCategoryAndPrice, ...), which would
 * multiply combinatorially as more filters are added. Kept as one plain method
 * rather than a chain of reusable Specification fragments since there is only
 * one caller (product listing) - reaching for that abstraction now would be
 * speculative.
 */
public final class ProductSpecifications {

    private ProductSpecifications() {
    }

    public static Specification<Product> search(String searchTerm,
                                                   Long categoryId,
                                                   BigDecimal minPrice,
                                                   BigDecimal maxPrice,
                                                   ProductStatus status) {
        return (root, query, criteriaBuilder) -> {
            // Fetch-join category for the actual result query only - adding it to the
            // count query as well would be wasted work and, for some providers, invalid.
            if (Long.class != query.getResultType()) {
                root.fetch("category", JoinType.LEFT);
            }

            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(root.get("status"), status));

            if (categoryId != null) {
                predicates.add(criteriaBuilder.equal(root.get("category").get("id"), categoryId));
            }

            if (searchTerm != null && !searchTerm.isBlank()) {
                String pattern = "%" + searchTerm.trim().toLowerCase() + "%";
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), pattern)
                ));
            }

            if (minPrice != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("price"), minPrice));
            }

            if (maxPrice != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("price"), maxPrice));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}

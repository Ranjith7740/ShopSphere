package com.shopsphere.category.repository;

import com.shopsphere.category.entity.Category;
import com.shopsphere.category.entity.CategoryStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    Optional<Category> findByName(String name);

    boolean existsByName(String name);

    List<Category> findByStatus(CategoryStatus status);
}

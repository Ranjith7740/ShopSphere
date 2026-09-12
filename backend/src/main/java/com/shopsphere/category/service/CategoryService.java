package com.shopsphere.category.service;

import com.shopsphere.category.dto.CategoryResponse;
import com.shopsphere.category.dto.CreateCategoryRequest;
import com.shopsphere.category.dto.UpdateCategoryRequest;
import com.shopsphere.category.entity.Category;
import com.shopsphere.category.entity.CategoryStatus;
import com.shopsphere.category.repository.CategoryRepository;
import com.shopsphere.exception.CategoryNotFoundException;
import com.shopsphere.exception.DuplicateCategoryException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public List<CategoryResponse> getActiveCategories() {
        return categoryRepository.findByStatus(CategoryStatus.ACTIVE).stream()
                .map(CategoryResponse::fromEntity)
                .toList();
    }

    public CategoryResponse createCategory(CreateCategoryRequest request) {
        if (categoryRepository.existsByName(request.name())) {
            throw new DuplicateCategoryException(request.name());
        }
        Category category = new Category();
        category.setName(request.name());
        category.setDescription(request.description());
        category.setStatus(CategoryStatus.ACTIVE);
        return CategoryResponse.fromEntity(categoryRepository.save(category));
    }

    public CategoryResponse updateCategory(Long categoryId, UpdateCategoryRequest request) {
        Category category = findById(categoryId);

        if (!category.getName().equals(request.name()) && categoryRepository.existsByName(request.name())) {
            throw new DuplicateCategoryException(request.name());
        }

        category.setName(request.name());
        category.setDescription(request.description());
        return CategoryResponse.fromEntity(categoryRepository.save(category));
    }

    public void deactivateCategory(Long categoryId) {
        Category category = findById(categoryId);
        category.setStatus(CategoryStatus.INACTIVE);
        categoryRepository.save(category);
    }

    private Category findById(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new CategoryNotFoundException(categoryId));
    }
}

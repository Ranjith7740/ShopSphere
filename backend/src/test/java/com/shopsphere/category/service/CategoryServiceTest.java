package com.shopsphere.category.service;

import com.shopsphere.category.dto.CategoryResponse;
import com.shopsphere.category.dto.CreateCategoryRequest;
import com.shopsphere.category.dto.UpdateCategoryRequest;
import com.shopsphere.category.entity.Category;
import com.shopsphere.category.entity.CategoryStatus;
import com.shopsphere.category.repository.CategoryRepository;
import com.shopsphere.exception.CategoryNotFoundException;
import com.shopsphere.exception.DuplicateCategoryException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    private CategoryService categoryService;

    @BeforeEach
    void setUp() {
        categoryService = new CategoryService(categoryRepository);
    }

    private Category existingCategory(Long id, String name, CategoryStatus status) {
        Category category = new Category();
        category.setId(id);
        category.setName(name);
        category.setDescription("Some description");
        category.setStatus(status);
        return category;
    }

    @Test
    void createCategory_withUniqueName_savesActiveCategory() {
        CreateCategoryRequest request = new CreateCategoryRequest("Electronics", "Gadgets");
        when(categoryRepository.existsByName("Electronics")).thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenAnswer(invocation -> {
            Category category = invocation.getArgument(0);
            category.setId(1L);
            return category;
        });

        CategoryResponse response = categoryService.createCategory(request);

        ArgumentCaptor<Category> captor = ArgumentCaptor.forClass(Category.class);
        verify(categoryRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(CategoryStatus.ACTIVE);
        assertThat(response.name()).isEqualTo("Electronics");
        assertThat(response.status()).isEqualTo(CategoryStatus.ACTIVE);
    }

    @Test
    void createCategory_withDuplicateName_throwsAndNeverSaves() {
        CreateCategoryRequest request = new CreateCategoryRequest("Electronics", "Gadgets");
        when(categoryRepository.existsByName("Electronics")).thenReturn(true);

        assertThrows(DuplicateCategoryException.class, () -> categoryService.createCategory(request));

        verify(categoryRepository, never()).save(any());
    }

    @Test
    void updateCategory_existing_updatesNameAndDescription() {
        Category category = existingCategory(1L, "Electronics", CategoryStatus.ACTIVE);
        UpdateCategoryRequest request = new UpdateCategoryRequest("Consumer Electronics", "Updated description");
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(categoryRepository.existsByName("Consumer Electronics")).thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CategoryResponse response = categoryService.updateCategory(1L, request);

        assertThat(response.name()).isEqualTo("Consumer Electronics");
        assertThat(response.description()).isEqualTo("Updated description");
    }

    @Test
    void updateCategory_renamedToSameName_doesNotTreatAsDuplicate() {
        Category category = existingCategory(1L, "Electronics", CategoryStatus.ACTIVE);
        UpdateCategoryRequest request = new UpdateCategoryRequest("Electronics", "Updated description");
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(categoryRepository.save(any(Category.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CategoryResponse response = categoryService.updateCategory(1L, request);

        assertThat(response.name()).isEqualTo("Electronics");
        verify(categoryRepository, never()).existsByName(any());
    }

    @Test
    void updateCategory_toNameUsedByAnotherCategory_throws() {
        Category category = existingCategory(1L, "Electronics", CategoryStatus.ACTIVE);
        UpdateCategoryRequest request = new UpdateCategoryRequest("Books", "Updated description");
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(categoryRepository.existsByName("Books")).thenReturn(true);

        assertThrows(DuplicateCategoryException.class, () -> categoryService.updateCategory(1L, request));

        verify(categoryRepository, never()).save(any());
    }

    @Test
    void updateCategory_notFound_throws() {
        UpdateCategoryRequest request = new UpdateCategoryRequest("Electronics", "Updated description");
        when(categoryRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(CategoryNotFoundException.class, () -> categoryService.updateCategory(999L, request));
    }

    @Test
    void deactivateCategory_setsStatusInactive() {
        Category category = existingCategory(1L, "Electronics", CategoryStatus.ACTIVE);
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(categoryRepository.save(any(Category.class))).thenAnswer(invocation -> invocation.getArgument(0));

        categoryService.deactivateCategory(1L);

        ArgumentCaptor<Category> captor = ArgumentCaptor.forClass(Category.class);
        verify(categoryRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(CategoryStatus.INACTIVE);
    }

    @Test
    void deactivateCategory_notFound_throws() {
        when(categoryRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(CategoryNotFoundException.class, () -> categoryService.deactivateCategory(999L));
    }

    @Test
    void getActiveCategories_returnsOnlyActiveOnesMappedToResponses() {
        Category active = existingCategory(1L, "Electronics", CategoryStatus.ACTIVE);
        when(categoryRepository.findByStatus(CategoryStatus.ACTIVE)).thenReturn(List.of(active));

        List<CategoryResponse> responses = categoryService.getActiveCategories();

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).name()).isEqualTo("Electronics");
    }
}

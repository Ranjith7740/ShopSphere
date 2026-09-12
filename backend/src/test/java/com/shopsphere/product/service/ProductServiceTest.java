package com.shopsphere.product.service;

import com.shopsphere.category.entity.Category;
import com.shopsphere.category.entity.CategoryStatus;
import com.shopsphere.category.repository.CategoryRepository;
import com.shopsphere.exception.CategoryNotFoundException;
import com.shopsphere.exception.InactiveCategoryException;
import com.shopsphere.exception.InvalidPaginationException;
import com.shopsphere.exception.InvalidSortException;
import com.shopsphere.exception.ProductNotFoundException;
import com.shopsphere.product.dto.CreateProductRequest;
import com.shopsphere.product.dto.ProductResponse;
import com.shopsphere.product.dto.UpdateProductRequest;
import com.shopsphere.product.entity.Product;
import com.shopsphere.product.entity.ProductStatus;
import com.shopsphere.product.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    private ProductService productService;

    @BeforeEach
    void setUp() {
        productService = new ProductService(productRepository, categoryRepository);
    }

    private Category category(Long id, CategoryStatus status) {
        Category category = new Category();
        category.setId(id);
        category.setName("Electronics");
        category.setStatus(status);
        return category;
    }

    private Product product(Long id, Category category, ProductStatus status) {
        Product product = new Product();
        product.setId(id);
        product.setCategory(category);
        product.setName("Phone");
        product.setDescription("desc");
        product.setPrice(new BigDecimal("50000.00"));
        product.setStockQuantity(10);
        product.setStatus(status);
        return product;
    }

    private CreateProductRequest createRequest(Long categoryId) {
        return new CreateProductRequest(categoryId, "Phone", "desc", new BigDecimal("50000.00"), 10);
    }

    private UpdateProductRequest updateRequest(Long categoryId) {
        return new UpdateProductRequest(categoryId, "Phone Pro", "updated desc", new BigDecimal("60000.00"), 5);
    }

    @Test
    void createProduct_withActiveCategory_savesActiveProduct() {
        Category category = category(1L, CategoryStatus.ACTIVE);
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> {
            Product product = invocation.getArgument(0);
            product.setId(1L);
            return product;
        });

        ProductResponse response = productService.createProduct(createRequest(1L));

        ArgumentCaptor<Product> captor = ArgumentCaptor.forClass(Product.class);
        verify(productRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(ProductStatus.ACTIVE);
        assertThat(response.categoryId()).isEqualTo(1L);
        assertThat(response.status()).isEqualTo(ProductStatus.ACTIVE);
    }

    @Test
    void createProduct_withNonExistentCategory_throwsAndNeverSaves() {
        when(categoryRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(CategoryNotFoundException.class, () -> productService.createProduct(createRequest(999L)));

        verify(productRepository, never()).save(any());
    }

    @Test
    void createProduct_withInactiveCategory_throwsAndNeverSaves() {
        Category inactive = category(1L, CategoryStatus.INACTIVE);
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(inactive));

        assertThrows(InactiveCategoryException.class, () -> productService.createProduct(createRequest(1L)));

        verify(productRepository, never()).save(any());
    }

    @Test
    void updateProduct_existing_updatesFields() {
        Category category = category(1L, CategoryStatus.ACTIVE);
        Product existing = product(1L, category, ProductStatus.ACTIVE);
        when(productRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response = productService.updateProduct(1L, updateRequest(1L));

        assertThat(response.name()).isEqualTo("Phone Pro");
        assertThat(response.price()).isEqualTo(new BigDecimal("60000.00"));
        assertThat(response.stockQuantity()).isEqualTo(5);
    }

    @Test
    void updateProduct_movingToInactiveCategory_throws() {
        Category active = category(1L, CategoryStatus.ACTIVE);
        Category inactive = category(2L, CategoryStatus.INACTIVE);
        Product existing = product(1L, active, ProductStatus.ACTIVE);
        when(productRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(categoryRepository.findById(2L)).thenReturn(Optional.of(inactive));

        assertThrows(InactiveCategoryException.class, () -> productService.updateProduct(1L, updateRequest(2L)));

        verify(productRepository, never()).save(any());
    }

    @Test
    void updateProduct_notFound_throws() {
        when(productRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ProductNotFoundException.class, () -> productService.updateProduct(999L, updateRequest(1L)));
    }

    @Test
    void deactivateProduct_setsStatusInactive() {
        Category category = category(1L, CategoryStatus.ACTIVE);
        Product existing = product(1L, category, ProductStatus.ACTIVE);
        when(productRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        productService.deactivateProduct(1L);

        ArgumentCaptor<Product> captor = ArgumentCaptor.forClass(Product.class);
        verify(productRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(ProductStatus.INACTIVE);
    }

    @Test
    void deactivateProduct_notFound_throws() {
        when(productRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ProductNotFoundException.class, () -> productService.deactivateProduct(999L));
    }

    @Test
    void getActiveProductById_activeProduct_returnsResponse() {
        Category category = category(1L, CategoryStatus.ACTIVE);
        Product active = product(1L, category, ProductStatus.ACTIVE);
        when(productRepository.findById(1L)).thenReturn(Optional.of(active));

        ProductResponse response = productService.getActiveProductById(1L);

        assertThat(response.id()).isEqualTo(1L);
    }

    @Test
    void getActiveProductById_inactiveProduct_throwsNotFound() {
        Category category = category(1L, CategoryStatus.ACTIVE);
        Product inactive = product(1L, category, ProductStatus.INACTIVE);
        when(productRepository.findById(1L)).thenReturn(Optional.of(inactive));

        assertThrows(ProductNotFoundException.class, () -> productService.getActiveProductById(1L));
    }

    @Test
    void getActiveProductById_missingProduct_throwsNotFound() {
        when(productRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ProductNotFoundException.class, () -> productService.getActiveProductById(999L));
    }

    @Test
    void searchActiveProducts_unsupportedSortField_throws() {
        assertThrows(InvalidSortException.class,
                () -> productService.searchActiveProducts(null, null, null, null, "stockQuantity,asc", 0, 10));
    }

    @Test
    void searchActiveProducts_pageSizeAboveMaximum_throws() {
        assertThrows(InvalidPaginationException.class,
                () -> productService.searchActiveProducts(null, null, null, null, "price,asc", 0, 101));
    }

    @Test
    void searchActiveProducts_negativePage_throws() {
        assertThrows(InvalidPaginationException.class,
                () -> productService.searchActiveProducts(null, null, null, null, "price,asc", -1, 10));
    }
}

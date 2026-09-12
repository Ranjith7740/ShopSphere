package com.shopsphere.product;

import com.shopsphere.category.entity.Category;
import com.shopsphere.category.entity.CategoryStatus;
import com.shopsphere.category.repository.CategoryRepository;
import com.shopsphere.product.entity.Product;
import com.shopsphere.product.entity.ProductStatus;
import com.shopsphere.product.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises GET /api/products against a real H2 database (via ProductSpecifications
 * and Spring Data pagination) rather than mocking the repository, since the whole
 * point of this endpoint is the dynamic query construction - a mock would just
 * verify the mock was called, not that the generated query is correct.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ProductListingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    private Long electronicsId;
    private Long booksId;

    @BeforeEach
    void seedData() {
        productRepository.deleteAll();
        categoryRepository.deleteAll();

        Category electronics = new Category();
        electronics.setName("Electronics");
        electronics.setStatus(CategoryStatus.ACTIVE);
        electronicsId = categoryRepository.save(electronics).getId();

        Category books = new Category();
        books.setName("Books");
        books.setStatus(CategoryStatus.ACTIVE);
        booksId = categoryRepository.save(books).getId();

        saveProduct("Smart Phone", "Latest smart phone", new BigDecimal("50000.00"), electronics, ProductStatus.ACTIVE);
        saveProduct("Laptop", "Powerful laptop", new BigDecimal("80000.00"), electronics, ProductStatus.ACTIVE);
        saveProduct("Charger", "Fast charger", new BigDecimal("1500.00"), electronics, ProductStatus.ACTIVE);
        saveProduct("Novel", "Fiction novel", new BigDecimal("400.00"), books, ProductStatus.ACTIVE);
        saveProduct("Discontinued Gadget", "No longer sold", new BigDecimal("999.00"), electronics, ProductStatus.INACTIVE);
    }

    private void saveProduct(String name, String description, BigDecimal price, Category category, ProductStatus status) {
        Product product = new Product();
        product.setName(name);
        product.setDescription(description);
        product.setPrice(price);
        product.setStockQuantity(10);
        product.setCategory(category);
        product.setStatus(status);
        productRepository.save(product);
    }

    @Test
    void listProducts_defaultParams_excludesInactiveProducts() throws Exception {
        mockMvc.perform(get("/api/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(4))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(10));
    }

    @Test
    void listProducts_search_matchesNameOrDescription() throws Exception {
        mockMvc.perform(get("/api/products").param("search", "phone"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.data[0].name").value("Smart Phone"));
    }

    @Test
    void listProducts_categoryFilter_returnsOnlyThatCategory() throws Exception {
        mockMvc.perform(get("/api/products").param("categoryId", String.valueOf(booksId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.data[0].categoryId").value(booksId));
    }

    @Test
    void listProducts_priceRange_filtersInclusively() throws Exception {
        mockMvc.perform(get("/api/products")
                        .param("minPrice", "1000")
                        .param("maxPrice", "60000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void listProducts_sortByPriceAsc_ordersAscending() throws Exception {
        mockMvc.perform(get("/api/products").param("sort", "price,asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].name").value("Novel"))
                .andExpect(jsonPath("$.data[3].name").value("Laptop"));
    }

    @Test
    void listProducts_combinedCategoryAndPriceFilters() throws Exception {
        mockMvc.perform(get("/api/products")
                        .param("categoryId", String.valueOf(electronicsId))
                        .param("maxPrice", "2000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.data[0].name").value("Charger"));
    }

    @Test
    void listProducts_pagination_respectsPageAndSize() throws Exception {
        mockMvc.perform(get("/api/products").param("size", "2").param("page", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(4))
                .andExpect(jsonPath("$.totalPages").value(2));
    }

    @Test
    void listProducts_unsupportedSortField_isBadRequest() throws Exception {
        mockMvc.perform(get("/api/products").param("sort", "stockQuantity,asc"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listProducts_pageSizeAboveMaximum_isBadRequest() throws Exception {
        mockMvc.perform(get("/api/products").param("size", "101"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listProducts_negativePage_isBadRequest() throws Exception {
        mockMvc.perform(get("/api/products").param("page", "-1"))
                .andExpect(status().isBadRequest());
    }
}

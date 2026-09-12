package com.shopsphere.product;

import com.shopsphere.category.entity.Category;
import com.shopsphere.category.entity.CategoryStatus;
import com.shopsphere.category.repository.CategoryRepository;
import com.shopsphere.product.entity.Product;
import com.shopsphere.product.entity.ProductStatus;
import com.shopsphere.product.repository.ProductRepository;
import com.shopsphere.security.service.JwtService;
import com.shopsphere.user.entity.Role;
import com.shopsphere.user.entity.User;
import com.shopsphere.user.entity.UserStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies role-based access for the product endpoints through the real Spring
 * Security filter chain, same approach as AuthorizationIntegrationTest and
 * CategoryAuthorizationTest: public reads are open, admin mutations require
 * ROLE_ADMIN, and a CUSTOMER token is rejected with 403.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ProductAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockitoBean
    private ProductRepository productRepository;

    @MockitoBean
    private CategoryRepository categoryRepository;

    private User user(String email, Role role) {
        User user = new User();
        user.setId(1L);
        user.setName("Test User");
        user.setEmail(email);
        user.setPhone("9876543210");
        user.setRole(role);
        user.setStatus(UserStatus.ACTIVE);
        return user;
    }

    private String tokenFor(String email, Role role) {
        return jwtService.generateToken(user(email, role));
    }

    private Category activeCategory() {
        Category category = new Category();
        category.setId(1L);
        category.setName("Electronics");
        category.setStatus(CategoryStatus.ACTIVE);
        return category;
    }

    private Product activeProduct() {
        Product product = new Product();
        product.setId(1L);
        product.setName("Phone");
        product.setDescription("desc");
        product.setPrice(new BigDecimal("50000.00"));
        product.setStockQuantity(10);
        product.setCategory(activeCategory());
        product.setStatus(ProductStatus.ACTIVE);
        return product;
    }

    private String createProductBody() {
        return "{\"categoryId\":1,\"name\":\"Phone\",\"description\":\"desc\",\"price\":50000.00,\"stockQuantity\":10}";
    }

    @Test
    void listProducts_withoutToken_isOk() throws Exception {
        when(productRepository.findAll(
                org.mockito.ArgumentMatchers.<org.springframework.data.jpa.domain.Specification<Product>>any(),
                org.mockito.ArgumentMatchers.any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(org.springframework.data.domain.Page.empty());

        mockMvc.perform(get("/api/products"))
                .andExpect(status().isOk());
    }

    @Test
    void getProductById_withoutToken_isOk() throws Exception {
        when(productRepository.findById(1L)).thenReturn(Optional.of(activeProduct()));

        mockMvc.perform(get("/api/products/1"))
                .andExpect(status().isOk());
    }

    @Test
    void createProduct_withCustomerToken_isForbidden() throws Exception {
        mockMvc.perform(post("/api/admin/products")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor("customer@example.com", Role.CUSTOMER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createProductBody()))
                .andExpect(status().isForbidden());
    }

    @Test
    void createProduct_withoutToken_isUnauthorized() throws Exception {
        mockMvc.perform(post("/api/admin/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createProductBody()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createProduct_withAdminToken_isCreated() throws Exception {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(activeCategory()));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> {
            Product product = invocation.getArgument(0);
            product.setId(1L);
            return product;
        });

        mockMvc.perform(post("/api/admin/products")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor("admin@example.com", Role.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createProductBody()))
                .andExpect(status().isCreated());
    }

    @Test
    void updateProduct_withCustomerToken_isForbidden() throws Exception {
        mockMvc.perform(put("/api/admin/products/1")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor("customer@example.com", Role.CUSTOMER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createProductBody()))
                .andExpect(status().isForbidden());
    }

    @Test
    void deactivateProduct_withCustomerToken_isForbidden() throws Exception {
        mockMvc.perform(delete("/api/admin/products/1")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor("customer@example.com", Role.CUSTOMER)))
                .andExpect(status().isForbidden());
    }

    @Test
    void deactivateProduct_withAdminToken_isNoContent() throws Exception {
        when(productRepository.findById(1L)).thenReturn(Optional.of(activeProduct()));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(delete("/api/admin/products/1")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor("admin@example.com", Role.ADMIN)))
                .andExpect(status().isNoContent());
    }

    @Test
    void deactivateProduct_withoutToken_isUnauthorized() throws Exception {
        mockMvc.perform(delete("/api/admin/products/1"))
                .andExpect(status().isUnauthorized());
    }
}

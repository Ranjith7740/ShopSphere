package com.shopsphere.category;

import com.shopsphere.category.entity.Category;
import com.shopsphere.category.entity.CategoryStatus;
import com.shopsphere.category.repository.CategoryRepository;
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

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies role-based access through the real Spring Security filter chain,
 * same approach as AuthorizationIntegrationTest: public category reads are open,
 * admin mutations require ROLE_ADMIN, and a CUSTOMER token is rejected with 403.
 */
@SpringBootTest
@AutoConfigureMockMvc
class CategoryAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

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

    @Test
    void getCategories_withoutToken_isOk() throws Exception {
        when(categoryRepository.findByStatus(CategoryStatus.ACTIVE)).thenReturn(List.of());

        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk());
    }

    @Test
    void createCategory_withCustomerToken_isForbidden() throws Exception {
        mockMvc.perform(post("/api/admin/categories")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor("customer@example.com", Role.CUSTOMER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Electronics\",\"description\":\"Gadgets\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void createCategory_withoutToken_isUnauthorized() throws Exception {
        mockMvc.perform(post("/api/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Electronics\",\"description\":\"Gadgets\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createCategory_withAdminToken_isCreated() throws Exception {
        when(categoryRepository.existsByName("Electronics")).thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenAnswer(invocation -> {
            Category category = invocation.getArgument(0);
            category.setId(1L);
            return category;
        });

        mockMvc.perform(post("/api/admin/categories")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor("admin@example.com", Role.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Electronics\",\"description\":\"Gadgets\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void deactivateCategory_withCustomerToken_isForbidden() throws Exception {
        mockMvc.perform(delete("/api/admin/categories/1")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor("customer@example.com", Role.CUSTOMER)))
                .andExpect(status().isForbidden());
    }

    @Test
    void deactivateCategory_withAdminToken_isNoContent() throws Exception {
        Category category = new Category();
        category.setId(1L);
        category.setName("Electronics");
        category.setStatus(CategoryStatus.ACTIVE);
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(categoryRepository.save(any(Category.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(delete("/api/admin/categories/1")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor("admin@example.com", Role.ADMIN)))
                .andExpect(status().isNoContent());
    }
}

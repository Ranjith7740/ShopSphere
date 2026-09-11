package com.shopsphere.security;

import com.shopsphere.security.service.JwtService;
import com.shopsphere.user.entity.Role;
import com.shopsphere.user.entity.User;
import com.shopsphere.user.entity.UserStatus;
import com.shopsphere.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies the authorization rules end to end through the real Spring Security
 * filter chain: authentication requirement, role-based access to /api/admin/**,
 * and that /api/users/me is derived from the token subject rather than any
 * client-supplied identifier.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuthorizationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

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
    void usersMe_withoutToken_isUnauthorized() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void usersMe_withCustomerToken_returnsOwnProfile() throws Exception {
        String email = "alice@example.com";
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user(email, Role.CUSTOMER)));

        mockMvc.perform(get("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(email, Role.CUSTOMER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));
    }

    @Test
    void usersMe_isDerivedFromTokenSubject_notFromClientSuppliedId() throws Exception {
        String tokenOwner = "bob@example.com";
        when(userRepository.findByEmail(tokenOwner)).thenReturn(Optional.of(user(tokenOwner, Role.CUSTOMER)));

        // A client-supplied id in the query string must have no effect - /api/users/me
        // has no id parameter at all, so this can only resolve via the token subject.
        mockMvc.perform(get("/api/users/me?id=999")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(tokenOwner, Role.CUSTOMER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(tokenOwner));
    }

    @Test
    void adminEndpoint_withCustomerToken_isForbidden() throws Exception {
        mockMvc.perform(get("/api/admin/ping")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor("customer@example.com", Role.CUSTOMER)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminEndpoint_withAdminToken_isOk() throws Exception {
        mockMvc.perform(get("/api/admin/ping")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor("admin@example.com", Role.ADMIN)))
                .andExpect(status().isOk());
    }

    @Test
    void adminEndpoint_withoutToken_isUnauthorized() throws Exception {
        mockMvc.perform(get("/api/admin/ping"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedEndpoint_withInvalidToken_isUnauthorized() throws Exception {
        mockMvc.perform(get("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized());
    }
}

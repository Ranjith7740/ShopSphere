package com.shopsphere;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Confirms the auth/user endpoints are actually discoverable through the
 * springdoc-generated OpenAPI document (what Swagger UI reads from).
 */
@SpringBootTest
@AutoConfigureMockMvc
class OpenApiDocumentationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void openApiDocument_listsAuthAndUserEndpoints() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("/api/auth/register")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("/api/auth/login")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("/api/users/me")));
    }

    @Test
    void openApiDocument_listsCategoryAndProductEndpoints() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("/api/categories")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("/api/admin/categories")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("/api/admin/categories/{categoryId}")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("/api/products")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("/api/products/{productId}")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("/api/admin/products")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("/api/admin/products/{productId}")));
    }
}

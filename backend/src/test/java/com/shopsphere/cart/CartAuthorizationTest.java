package com.shopsphere.cart;

import com.shopsphere.cart.entity.Cart;
import com.shopsphere.cart.entity.CartItem;
import com.shopsphere.cart.repository.CartItemRepository;
import com.shopsphere.cart.repository.CartRepository;
import com.shopsphere.product.entity.Product;
import com.shopsphere.product.entity.ProductStatus;
import com.shopsphere.product.repository.ProductRepository;
import com.shopsphere.security.service.JwtService;
import com.shopsphere.user.entity.Role;
import com.shopsphere.user.entity.User;
import com.shopsphere.user.entity.UserStatus;
import com.shopsphere.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies Cart access end to end through the real Spring Security filter
 * chain, same approach as ProductAuthorizationTest/AuthorizationIntegrationTest:
 * authentication is required, and ownership is derived only from the JWT
 * subject - a customer can never reach another customer's cart item.
 */
@SpringBootTest
@AutoConfigureMockMvc
class CartAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockitoBean
    private CartRepository cartRepository;

    @MockitoBean
    private CartItemRepository cartItemRepository;

    @MockitoBean
    private ProductRepository productRepository;

    @MockitoBean
    private UserRepository userRepository;

    private User user(Long id, String email) {
        User user = new User();
        user.setId(id);
        user.setName("Test User");
        user.setEmail(email);
        user.setPhone("9876543210");
        user.setRole(Role.CUSTOMER);
        user.setStatus(UserStatus.ACTIVE);
        return user;
    }

    private String tokenFor(String email) {
        return jwtService.generateToken(user(1L, email));
    }

    private Cart cart(Long id, User owner) {
        Cart cart = new Cart();
        cart.setId(id);
        cart.setUser(owner);
        return cart;
    }

    private Product product(Long id) {
        Product product = new Product();
        product.setId(id);
        product.setName("Phone");
        product.setPrice(new BigDecimal("50000.00"));
        product.setStockQuantity(10);
        product.setStatus(ProductStatus.ACTIVE);
        return product;
    }

    @Test
    void getCart_withoutToken_isUnauthorized() throws Exception {
        mockMvc.perform(get("/api/cart"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getCart_withToken_returnsOwnCart() throws Exception {
        String email = "alice@example.com";
        User owner = user(1L, email);
        Cart cart = cart(10L, owner);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(owner));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findByCartId(10L)).thenReturn(List.of());

        mockMvc.perform(get("/api/cart")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cartId").value(10))
                .andExpect(jsonPath("$.items").isArray());
    }

    @Test
    void updateItem_belongingToAnotherCustomer_isNotFound() throws Exception {
        String requesterEmail = "bob@example.com";
        User requester = user(2L, requesterEmail);
        User otherOwner = user(1L, "alice@example.com");
        Cart otherCart = cart(10L, otherOwner);
        CartItem othersItem = new CartItem();
        othersItem.setId(5L);
        othersItem.setCart(otherCart);
        othersItem.setProduct(product(100L));
        othersItem.setQuantity(1);

        when(userRepository.findByEmail(requesterEmail)).thenReturn(Optional.of(requester));
        when(cartItemRepository.findById(5L)).thenReturn(Optional.of(othersItem));

        mockMvc.perform(put("/api/cart/items/5")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(requesterEmail))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quantity\":2}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void removeItem_belongingToAnotherCustomer_isNotFound() throws Exception {
        String requesterEmail = "bob@example.com";
        User requester = user(2L, requesterEmail);
        User otherOwner = user(1L, "alice@example.com");
        Cart otherCart = cart(10L, otherOwner);
        CartItem othersItem = new CartItem();
        othersItem.setId(5L);
        othersItem.setCart(otherCart);
        othersItem.setProduct(product(100L));
        othersItem.setQuantity(1);

        when(userRepository.findByEmail(requesterEmail)).thenReturn(Optional.of(requester));
        when(cartItemRepository.findById(5L)).thenReturn(Optional.of(othersItem));

        mockMvc.perform(delete("/api/cart/items/5")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(requesterEmail)))
                .andExpect(status().isNotFound());
    }

    @Test
    void addItem_invalidRequest_isBadRequest() throws Exception {
        String email = "alice@example.com";
        mockMvc.perform(post("/api/cart/items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(email))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":null,\"quantity\":0}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void addItem_exceedingStock_isConflict() throws Exception {
        String email = "alice@example.com";
        User owner = user(1L, email);
        Cart cart = cart(10L, owner);
        Product lowStockProduct = product(100L);
        lowStockProduct.setStockQuantity(2);

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(owner));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(productRepository.findById(100L)).thenReturn(Optional.of(lowStockProduct));
        when(cartItemRepository.findByCartIdAndProductId(10L, 100L)).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/cart/items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(email))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":100,\"quantity\":5}"))
                .andExpect(status().isConflict());
    }

    @Test
    void addItem_inactiveProduct_isNotFound() throws Exception {
        String email = "alice@example.com";
        User owner = user(1L, email);
        Cart cart = cart(10L, owner);
        Product inactiveProduct = product(100L);
        inactiveProduct.setStatus(ProductStatus.INACTIVE);

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(owner));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(productRepository.findById(100L)).thenReturn(Optional.of(inactiveProduct));

        mockMvc.perform(post("/api/cart/items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(email))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":100,\"quantity\":1}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void addItem_successfulAdd_returnsOkWithUpdatedCart() throws Exception {
        String email = "alice@example.com";
        User owner = user(1L, email);
        Cart cart = cart(10L, owner);
        Product product = product(100L);

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(owner));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(productRepository.findById(100L)).thenReturn(Optional.of(product));
        when(cartItemRepository.findByCartIdAndProductId(10L, 100L)).thenReturn(Optional.empty());
        when(cartItemRepository.save(any(CartItem.class))).thenAnswer(invocation -> {
            CartItem saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });
        when(cartItemRepository.findByCartId(10L)).thenAnswer(invocation -> {
            CartItem item = new CartItem();
            item.setId(1L);
            item.setCart(cart);
            item.setProduct(product);
            item.setQuantity(2);
            return List.of(item);
        });

        mockMvc.perform(post("/api/cart/items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(email))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":100,\"quantity\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].quantity").value(2))
                .andExpect(jsonPath("$.cartTotal").value(100000.00));
    }

    @Test
    void clearCart_removesItemsAndReturnsEmptyCart() throws Exception {
        String email = "alice@example.com";
        User owner = user(1L, email);
        Cart cart = cart(10L, owner);

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(owner));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findByCartId(10L)).thenReturn(List.of());

        mockMvc.perform(delete("/api/cart/items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty());
    }
}

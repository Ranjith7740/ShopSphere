package com.shopsphere.cart.controller;

import com.shopsphere.cart.dto.AddCartItemRequest;
import com.shopsphere.cart.dto.CartResponse;
import com.shopsphere.cart.dto.UpdateCartItemRequest;
import com.shopsphere.cart.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Every operation resolves the owning cart from the JWT subject (via
 * CartService) - never from a client-supplied id - so a customer can only
 * ever act on their own cart, matching UserController's convention.
 * Covered by SecurityConfig's anyRequest().authenticated() rule; no
 * SecurityConfig change is needed for this controller.
 */
@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<CartResponse> getCart(@AuthenticationPrincipal String email) {
        return ResponseEntity.ok(cartService.getCart(email));
    }

    @PostMapping("/items")
    public ResponseEntity<CartResponse> addItem(@AuthenticationPrincipal String email,
                                                  @Valid @RequestBody AddCartItemRequest request) {
        return ResponseEntity.ok(cartService.addItem(email, request));
    }

    @PutMapping("/items/{cartItemId}")
    public ResponseEntity<CartResponse> updateItem(@AuthenticationPrincipal String email,
                                                     @PathVariable Long cartItemId,
                                                     @Valid @RequestBody UpdateCartItemRequest request) {
        return ResponseEntity.ok(cartService.updateItem(email, cartItemId, request));
    }

    @DeleteMapping("/items/{cartItemId}")
    public ResponseEntity<CartResponse> removeItem(@AuthenticationPrincipal String email,
                                                      @PathVariable Long cartItemId) {
        return ResponseEntity.ok(cartService.removeItem(email, cartItemId));
    }

    @DeleteMapping("/items")
    public ResponseEntity<CartResponse> clearCart(@AuthenticationPrincipal String email) {
        return ResponseEntity.ok(cartService.clearCart(email));
    }
}

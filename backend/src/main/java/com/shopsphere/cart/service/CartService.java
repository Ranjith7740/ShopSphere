package com.shopsphere.cart.service;

import com.shopsphere.cart.dto.AddCartItemRequest;
import com.shopsphere.cart.dto.CartItemResponse;
import com.shopsphere.cart.dto.CartResponse;
import com.shopsphere.cart.dto.UpdateCartItemRequest;
import com.shopsphere.cart.entity.Cart;
import com.shopsphere.cart.entity.CartItem;
import com.shopsphere.cart.repository.CartItemRepository;
import com.shopsphere.cart.repository.CartRepository;
import com.shopsphere.exception.CartItemNotFoundException;
import com.shopsphere.exception.InsufficientStockException;
import com.shopsphere.exception.ProductNotFoundException;
import com.shopsphere.exception.UserNotFoundException;
import com.shopsphere.product.entity.Product;
import com.shopsphere.product.entity.ProductStatus;
import com.shopsphere.product.repository.ProductRepository;
import com.shopsphere.user.entity.User;
import com.shopsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Transactional
    public CartResponse getCart(String email) {
        Cart cart = getOrCreateCart(email);
        return toCartResponse(cart);
    }

    @Transactional
    public CartResponse addItem(String email, AddCartItemRequest request) {
        Cart cart = getOrCreateCart(email);
        Product product = findActiveProduct(request.productId());

        CartItem cartItem = cartItemRepository.findByCartIdAndProductId(cart.getId(), product.getId())
                .orElse(null);

        int newQuantity = request.quantity() + (cartItem == null ? 0 : cartItem.getQuantity());
        validateStock(product, newQuantity);

        if (cartItem == null) {
            cartItem = new CartItem();
            cartItem.setCart(cart);
            cartItem.setProduct(product);
        }
        cartItem.setQuantity(newQuantity);
        cartItemRepository.save(cartItem);

        return toCartResponse(cart);
    }

    @Transactional
    public CartResponse updateItem(String email, Long cartItemId, UpdateCartItemRequest request) {
        User user = findUserByEmail(email);
        CartItem cartItem = findOwnedCartItem(cartItemId, user.getId());

        Product product = findActiveProduct(cartItem.getProduct().getId());
        validateStock(product, request.quantity());

        cartItem.setQuantity(request.quantity());
        cartItemRepository.save(cartItem);

        return toCartResponse(cartItem.getCart());
    }

    @Transactional
    public CartResponse removeItem(String email, Long cartItemId) {
        User user = findUserByEmail(email);
        CartItem cartItem = findOwnedCartItem(cartItemId, user.getId());

        Cart cart = cartItem.getCart();
        cartItemRepository.delete(cartItem);

        return toCartResponse(cart);
    }

    @Transactional
    public CartResponse clearCart(String email) {
        Cart cart = getOrCreateCart(email);
        cartItemRepository.deleteAllByCartId(cart.getId());
        return toCartResponse(cart);
    }

    private Cart getOrCreateCart(String email) {
        User user = findUserByEmail(email);
        return cartRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    Cart cart = new Cart();
                    cart.setUser(user);
                    return cartRepository.save(cart);
                });
    }

    private CartItem findOwnedCartItem(Long cartItemId, Long userId) {
        CartItem cartItem = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new CartItemNotFoundException(cartItemId));
        if (!cartItem.getCart().getUser().getId().equals(userId)) {
            throw new CartItemNotFoundException(cartItemId);
        }
        return cartItem;
    }

    // Mirrors ProductService.getActiveProductById: an inactive or missing
    // product is reported identically as "not found" to the caller.
    private Product findActiveProduct(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));
        if (product.getStatus() != ProductStatus.ACTIVE) {
            throw new ProductNotFoundException(productId);
        }
        return product;
    }

    private void validateStock(Product product, int requestedQuantity) {
        if (requestedQuantity > product.getStockQuantity()) {
            throw new InsufficientStockException(product.getId(), requestedQuantity, product.getStockQuantity());
        }
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException(email));
    }

    private CartResponse toCartResponse(Cart cart) {
        List<CartItem> cartItems = cartItemRepository.findByCartId(cart.getId());

        List<CartItemResponse> itemResponses = cartItems.stream()
                .map(CartItemResponse::fromEntity)
                .toList();

        BigDecimal cartTotal = itemResponses.stream()
                .filter(this::isPurchasable)
                .map(CartItemResponse::subtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CartResponse(cart.getId(), itemResponses, cartTotal);
    }

    private boolean isPurchasable(CartItemResponse item) {
        return item.productActive() && item.availableStock() > 0 && item.quantity() <= item.availableStock();
    }
}

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
import com.shopsphere.product.entity.Product;
import com.shopsphere.product.entity.ProductStatus;
import com.shopsphere.product.repository.ProductRepository;
import com.shopsphere.user.entity.Role;
import com.shopsphere.user.entity.User;
import com.shopsphere.user.entity.UserStatus;
import com.shopsphere.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private CartItemRepository cartItemRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private UserRepository userRepository;

    private CartService cartService;

    private static final String EMAIL = "customer@example.com";

    @BeforeEach
    void setUp() {
        cartService = new CartService(cartRepository, cartItemRepository, productRepository, userRepository);
    }

    private User user(Long id, String email) {
        User user = new User();
        user.setId(id);
        user.setName("Test User");
        user.setEmail(email);
        user.setRole(Role.CUSTOMER);
        user.setStatus(UserStatus.ACTIVE);
        return user;
    }

    private Cart cart(Long id, User owner) {
        Cart cart = new Cart();
        cart.setId(id);
        cart.setUser(owner);
        return cart;
    }

    private Product product(Long id, ProductStatus status, int stock, String price) {
        Product product = new Product();
        product.setId(id);
        product.setName("Phone");
        product.setPrice(new BigDecimal(price));
        product.setStockQuantity(stock);
        product.setStatus(status);
        return product;
    }

    private CartItem cartItem(Long id, Cart cart, Product product, int quantity) {
        CartItem cartItem = new CartItem();
        cartItem.setId(id);
        cartItem.setCart(cart);
        cartItem.setProduct(product);
        cartItem.setQuantity(quantity);
        return cartItem;
    }

    @Test
    void getCart_noExistingCart_createsCartLazily() {
        User user = user(1L, EMAIL);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.empty());
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> {
            Cart saved = invocation.getArgument(0);
            saved.setId(10L);
            return saved;
        });
        when(cartItemRepository.findByCartId(10L)).thenReturn(List.of());

        CartResponse response = cartService.getCart(EMAIL);

        ArgumentCaptor<Cart> captor = ArgumentCaptor.forClass(Cart.class);
        verify(cartRepository).save(captor.capture());
        assertThat(captor.getValue().getUser()).isEqualTo(user);
        assertThat(response.cartId()).isEqualTo(10L);
        assertThat(response.items()).isEmpty();
        assertThat(response.cartTotal()).isEqualTo(BigDecimal.ZERO);
    }

    @Test
    void getCart_existingCart_reusesIt() {
        User user = user(1L, EMAIL);
        Cart existingCart = cart(10L, user);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(existingCart));
        when(cartItemRepository.findByCartId(10L)).thenReturn(List.of());

        cartService.getCart(EMAIL);

        verify(cartRepository, never()).save(any());
    }

    @Test
    void getCart_withItems_calculatesSubtotalsAndTotal() {
        User user = user(1L, EMAIL);
        Cart existingCart = cart(10L, user);
        Product product = product(100L, ProductStatus.ACTIVE, 10, "50.00");
        CartItem item = cartItem(1L, existingCart, product, 2);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(existingCart));
        when(cartItemRepository.findByCartId(10L)).thenReturn(List.of(item));

        CartResponse response = cartService.getCart(EMAIL);

        assertThat(response.items()).hasSize(1);
        CartItemResponse itemResponse = response.items().get(0);
        assertThat(itemResponse.subtotal()).isEqualTo(new BigDecimal("100.00"));
        assertThat(response.cartTotal()).isEqualTo(new BigDecimal("100.00"));
    }

    @Test
    void getCart_inactiveProduct_remainsVisibleButExcludedFromTotal() {
        User user = user(1L, EMAIL);
        Cart existingCart = cart(10L, user);
        Product inactiveProduct = product(100L, ProductStatus.INACTIVE, 10, "50.00");
        CartItem item = cartItem(1L, existingCart, inactiveProduct, 2);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(existingCart));
        when(cartItemRepository.findByCartId(10L)).thenReturn(List.of(item));

        CartResponse response = cartService.getCart(EMAIL);

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).productActive()).isFalse();
        assertThat(response.cartTotal()).isEqualTo(BigDecimal.ZERO);
    }

    @Test
    void getCart_outOfStockProduct_remainsVisibleButExcludedFromTotal() {
        User user = user(1L, EMAIL);
        Cart existingCart = cart(10L, user);
        Product understockedProduct = product(100L, ProductStatus.ACTIVE, 1, "50.00");
        CartItem item = cartItem(1L, existingCart, understockedProduct, 5);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(existingCart));
        when(cartItemRepository.findByCartId(10L)).thenReturn(List.of(item));

        CartResponse response = cartService.getCart(EMAIL);

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).availableStock()).isEqualTo(1);
        assertThat(response.cartTotal()).isEqualTo(BigDecimal.ZERO);
    }

    @Test
    void getCart_mixOfEligibleAndIneligibleItems_totalOnlyIncludesEligible() {
        User user = user(1L, EMAIL);
        Cart existingCart = cart(10L, user);
        Product eligible = product(100L, ProductStatus.ACTIVE, 10, "50.00");
        Product ineligible = product(101L, ProductStatus.INACTIVE, 10, "30.00");
        CartItem eligibleItem = cartItem(1L, existingCart, eligible, 2);
        CartItem ineligibleItem = cartItem(2L, existingCart, ineligible, 1);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(existingCart));
        when(cartItemRepository.findByCartId(10L)).thenReturn(List.of(eligibleItem, ineligibleItem));

        CartResponse response = cartService.getCart(EMAIL);

        assertThat(response.items()).hasSize(2);
        assertThat(response.cartTotal()).isEqualTo(new BigDecimal("100.00"));
    }

    private BigDecimal cartTotalFor(int stock, int quantity) {
        User user = user(1L, EMAIL);
        Cart existingCart = cart(10L, user);
        Product product = product(100L, ProductStatus.ACTIVE, stock, "10.00");
        CartItem item = cartItem(1L, existingCart, product, quantity);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(existingCart));
        when(cartItemRepository.findByCartId(10L)).thenReturn(List.of(item));

        return cartService.getCart(EMAIL).cartTotal();
    }

    @Test
    void isPurchasable_stockZero_excludedFromTotal() {
        assertThat(cartTotalFor(0, 1)).isEqualTo(BigDecimal.ZERO);
    }

    @Test
    void isPurchasable_stockOneQuantityOne_includedInTotal() {
        assertThat(cartTotalFor(1, 1)).isEqualTo(new BigDecimal("10.00"));
    }

    @Test
    void isPurchasable_stockFiveQuantityFive_includedInTotal() {
        assertThat(cartTotalFor(5, 5)).isEqualTo(new BigDecimal("50.00"));
    }

    @Test
    void isPurchasable_stockFiveQuantitySix_excludedFromTotal() {
        assertThat(cartTotalFor(5, 6)).isEqualTo(BigDecimal.ZERO);
    }

    @Test
    void isPurchasable_stockTenQuantityTwo_includedInTotal() {
        assertThat(cartTotalFor(10, 2)).isEqualTo(new BigDecimal("20.00"));
    }

    @Test
    void addItem_newProduct_createsCartItem() {
        User user = user(1L, EMAIL);
        Cart existingCart = cart(10L, user);
        Product product = product(100L, ProductStatus.ACTIVE, 10, "50.00");

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(existingCart));
        when(productRepository.findById(100L)).thenReturn(Optional.of(product));
        when(cartItemRepository.findByCartIdAndProductId(10L, 100L)).thenReturn(Optional.empty());
        when(cartItemRepository.findByCartId(10L)).thenReturn(List.of());

        cartService.addItem(EMAIL, new AddCartItemRequest(100L, 2));

        ArgumentCaptor<CartItem> captor = ArgumentCaptor.forClass(CartItem.class);
        verify(cartItemRepository).save(captor.capture());
        assertThat(captor.getValue().getQuantity()).isEqualTo(2);
        assertThat(captor.getValue().getCart()).isEqualTo(existingCart);
        assertThat(captor.getValue().getProduct()).isEqualTo(product);
    }

    @Test
    void addItem_duplicateProduct_increasesQuantity() {
        User user = user(1L, EMAIL);
        Cart existingCart = cart(10L, user);
        Product product = product(100L, ProductStatus.ACTIVE, 10, "50.00");
        CartItem existingItem = cartItem(1L, existingCart, product, 3);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(existingCart));
        when(productRepository.findById(100L)).thenReturn(Optional.of(product));
        when(cartItemRepository.findByCartIdAndProductId(10L, 100L)).thenReturn(Optional.of(existingItem));
        when(cartItemRepository.findByCartId(10L)).thenReturn(List.of(existingItem));

        cartService.addItem(EMAIL, new AddCartItemRequest(100L, 2));

        assertThat(existingItem.getQuantity()).isEqualTo(5);
        verify(cartItemRepository).save(existingItem);
    }

    @Test
    void addItem_exceedingStock_throwsAndNeverSaves() {
        User user = user(1L, EMAIL);
        Cart existingCart = cart(10L, user);
        Product product = product(100L, ProductStatus.ACTIVE, 5, "50.00");
        CartItem existingItem = cartItem(1L, existingCart, product, 3);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(existingCart));
        when(productRepository.findById(100L)).thenReturn(Optional.of(product));
        when(cartItemRepository.findByCartIdAndProductId(10L, 100L)).thenReturn(Optional.of(existingItem));

        assertThrows(InsufficientStockException.class,
                () -> cartService.addItem(EMAIL, new AddCartItemRequest(100L, 3)));

        verify(cartItemRepository, never()).save(any());
    }

    @Test
    void addItem_inactiveProduct_throwsNotFound() {
        User user = user(1L, EMAIL);
        Cart existingCart = cart(10L, user);
        Product inactiveProduct = product(100L, ProductStatus.INACTIVE, 10, "50.00");

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(existingCart));
        when(productRepository.findById(100L)).thenReturn(Optional.of(inactiveProduct));

        assertThrows(ProductNotFoundException.class,
                () -> cartService.addItem(EMAIL, new AddCartItemRequest(100L, 1)));

        verify(cartItemRepository, never()).save(any());
    }

    @Test
    void addItem_nonExistentProduct_throwsNotFound() {
        User user = user(1L, EMAIL);
        Cart existingCart = cart(10L, user);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(existingCart));
        when(productRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ProductNotFoundException.class,
                () -> cartService.addItem(EMAIL, new AddCartItemRequest(999L, 1)));

        verify(cartItemRepository, never()).save(any());
    }

    @Test
    void updateItem_ownedItem_setsQuantity() {
        User user = user(1L, EMAIL);
        Cart existingCart = cart(10L, user);
        Product product = product(100L, ProductStatus.ACTIVE, 10, "50.00");
        CartItem item = cartItem(1L, existingCart, product, 2);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(cartItemRepository.findById(1L)).thenReturn(Optional.of(item));
        when(productRepository.findById(100L)).thenReturn(Optional.of(product));
        when(cartItemRepository.findByCartId(10L)).thenReturn(List.of(item));

        cartService.updateItem(EMAIL, 1L, new UpdateCartItemRequest(7));

        assertThat(item.getQuantity()).isEqualTo(7);
        verify(cartItemRepository).save(item);
    }

    @Test
    void updateItem_exceedingStock_throwsAndDoesNotSave() {
        User user = user(1L, EMAIL);
        Cart existingCart = cart(10L, user);
        Product product = product(100L, ProductStatus.ACTIVE, 5, "50.00");
        CartItem item = cartItem(1L, existingCart, product, 2);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(cartItemRepository.findById(1L)).thenReturn(Optional.of(item));
        when(productRepository.findById(100L)).thenReturn(Optional.of(product));

        assertThrows(InsufficientStockException.class,
                () -> cartService.updateItem(EMAIL, 1L, new UpdateCartItemRequest(6)));

        verify(cartItemRepository, never()).save(any());
    }

    @Test
    void updateItem_anotherUsersItem_throwsNotFound() {
        User owner = user(1L, EMAIL);
        User otherUser = user(2L, "other@example.com");
        Cart ownerCart = cart(10L, owner);
        Product product = product(100L, ProductStatus.ACTIVE, 10, "50.00");
        CartItem item = cartItem(1L, ownerCart, product, 2);

        when(userRepository.findByEmail("other@example.com")).thenReturn(Optional.of(otherUser));
        when(cartItemRepository.findById(1L)).thenReturn(Optional.of(item));

        assertThrows(CartItemNotFoundException.class,
                () -> cartService.updateItem("other@example.com", 1L, new UpdateCartItemRequest(3)));

        verify(cartItemRepository, never()).save(any());
    }

    @Test
    void removeItem_ownedItem_deletesIt() {
        User user = user(1L, EMAIL);
        Cart existingCart = cart(10L, user);
        Product product = product(100L, ProductStatus.ACTIVE, 10, "50.00");
        CartItem item = cartItem(1L, existingCart, product, 2);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(cartItemRepository.findById(1L)).thenReturn(Optional.of(item));
        when(cartItemRepository.findByCartId(10L)).thenReturn(List.of());

        cartService.removeItem(EMAIL, 1L);

        verify(cartItemRepository).delete(item);
    }

    @Test
    void removeItem_anotherUsersItem_throwsNotFoundAndNeverDeletes() {
        User owner = user(1L, EMAIL);
        User otherUser = user(2L, "other@example.com");
        Cart ownerCart = cart(10L, owner);
        Product product = product(100L, ProductStatus.ACTIVE, 10, "50.00");
        CartItem item = cartItem(1L, ownerCart, product, 2);

        when(userRepository.findByEmail("other@example.com")).thenReturn(Optional.of(otherUser));
        when(cartItemRepository.findById(1L)).thenReturn(Optional.of(item));

        assertThrows(CartItemNotFoundException.class, () -> cartService.removeItem("other@example.com", 1L));

        verify(cartItemRepository, never()).delete(any());
    }

    @Test
    void clearCart_removesAllItemsButKeepsCart() {
        User user = user(1L, EMAIL);
        Cart existingCart = cart(10L, user);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(existingCart));
        when(cartItemRepository.findByCartId(10L)).thenReturn(List.of());

        CartResponse response = cartService.clearCart(EMAIL);

        verify(cartItemRepository).deleteAllByCartId(10L);
        verify(cartRepository, never()).delete(any());
        verify(cartRepository, never()).deleteById(any());
        assertThat(response.cartId()).isEqualTo(10L);
        assertThat(response.items()).isEmpty();
    }

    @Test
    void cartTotal_isComputedFromCurrentProductPrice_neverFromClient() {
        // There is no field in AddCartItemRequest/UpdateCartItemRequest for a
        // client-supplied price or total - the backend can only ever compute
        // the total from Product.price, which this asserts end to end.
        User user = user(1L, EMAIL);
        Cart existingCart = cart(10L, user);
        Product product = product(100L, ProductStatus.ACTIVE, 10, "19.99");
        CartItem item = cartItem(1L, existingCart, product, 3);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(existingCart));
        when(cartItemRepository.findByCartId(10L)).thenReturn(List.of(item));

        CartResponse response = cartService.getCart(EMAIL);

        assertThat(response.cartTotal()).isEqualTo(new BigDecimal("59.97"));
    }
}

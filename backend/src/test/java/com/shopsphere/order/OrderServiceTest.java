package com.shopsphere.order;

import com.shopsphere.address.entity.Address;
import com.shopsphere.address.repository.AddressRepository;
import com.shopsphere.cart.entity.Cart;
import com.shopsphere.address.entity.AddressType;
import com.shopsphere.cart.entity.CartItem;
import com.shopsphere.cart.repository.CartItemRepository;
import com.shopsphere.cart.repository.CartRepository;
import com.shopsphere.exception.*;
import com.shopsphere.order.dto.OrderResponse;
import com.shopsphere.order.entity.Order;
import com.shopsphere.order.entity.OrderAddress;
import com.shopsphere.order.entity.OrderItem;
import com.shopsphere.order.entity.OrderStatus;
import com.shopsphere.order.repository.OrderAddressRepository;
import com.shopsphere.order.repository.OrderItemRepository;
import com.shopsphere.order.repository.OrderRepository;
import com.shopsphere.order.service.OrderService;
import com.shopsphere.product.entity.Product;
import com.shopsphere.product.entity.ProductStatus;
import com.shopsphere.product.repository.ProductRepository;
import com.shopsphere.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @InjectMocks
    private OrderService orderService;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderItemRepository orderItemRepository;

    @Mock
    private OrderAddressRepository orderAddressRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CartRepository cartRepository;

    @Mock
    private CartItemRepository cartItemRepository;

    @Mock
    private AddressRepository addressRepository;

    private User user;
    private Cart cart;
    private Product product;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");

        cart = new Cart();
        cart.setId(1L);
        cart.setUser(user);

        product = new Product();
        product.setId(1L);
        product.setPrice(new BigDecimal("100.00"));
        product.setStatus(ProductStatus.ACTIVE);
        product.setStockQuantity(10);
    }

    @Test
    void placeOrder_EmptyCart_ThrowsEmptyCartException() {
        when(cartRepository.findByUser(user))
                .thenReturn(Optional.of(cart));

        when(cartItemRepository.findByCart(cart))
                .thenReturn(Collections.emptyList());

        assertThrows(
                EmptyCartException.class,
                () -> orderService.placeOrder(1L, user)
        );
    }

    @Test
    void placeOrder_InactiveProduct_ThrowsProductUnavailableException() {
        CartItem item = new CartItem();
        item.setProduct(product);
        item.setQuantity(1);

        product.setStatus(ProductStatus.INACTIVE);

        when(cartRepository.findByUser(user))
                .thenReturn(Optional.of(cart));

        when(cartItemRepository.findByCart(cart))
                .thenReturn(List.of(item));

        when(addressRepository.findByIdAndUserId(anyLong(), anyLong()))
                .thenReturn(Optional.of(new Address()));

        assertThrows(
                ProductUnavailableException.class,
                () -> orderService.placeOrder(1L, user)
        );
    }

    @Test
    void placeOrder_WrongAddressOwnership_ThrowsAddressNotFoundException() {
        CartItem item = new CartItem();
        item.setProduct(product);
        item.setQuantity(1);

        when(cartRepository.findByUser(user))
                .thenReturn(Optional.of(cart));

        when(cartItemRepository.findByCart(cart))
                .thenReturn(List.of(item));

        when(addressRepository.findByIdAndUserId(anyLong(), anyLong()))
                .thenReturn(Optional.empty());

        assertThrows(
                AddressNotFoundException.class,
                () -> orderService.placeOrder(1L, user)
        );
    }

    @Test
    void placeOrder_SuccessfulTotalCalculation() {

        Product p1 = new Product();
        p1.setId(1L);
        p1.setPrice(new BigDecimal("10.00"));
        p1.setStatus(ProductStatus.ACTIVE);
        p1.setStockQuantity(10);

        Product p2 = new Product();
        p2.setId(2L);
        p2.setPrice(new BigDecimal("20.00"));
        p2.setStatus(ProductStatus.ACTIVE);
        p2.setStockQuantity(10);

        CartItem item1 = new CartItem();
        item1.setProduct(p1);
        item1.setQuantity(2);

        CartItem item2 = new CartItem();
        item2.setProduct(p2);
        item2.setQuantity(1);

        when(cartRepository.findByUser(user))
                .thenReturn(Optional.of(cart));

        when(cartItemRepository.findByCart(cart))
                .thenReturn(List.of(item1, item2));

        Address address = new Address();
        address.setId(1L);
        address.setUser(user);
        address.setFullName("Test User");
        address.setPhone("1234567890");
        address.setAddressLine1("Line 1");
        address.setCity("Chennai");
        address.setState("Tamil Nadu");
        address.setPostalCode("600001");
        address.setCountry("India");

        when(addressRepository.findByIdAndUserId(1L, 1L))
                .thenReturn(Optional.of(address));

        when(orderRepository.save(any(Order.class)))
                .thenAnswer(invocation -> {
                    Order order = invocation.getArgument(0);
                    order.setId(1L);
                    return order;
                });

        when(orderItemRepository.save(any(OrderItem.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        when(orderAddressRepository.save(any(OrderAddress.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        when(orderItemRepository.findByOrder(any(Order.class)))
                .thenReturn(Collections.emptyList());

        when(orderAddressRepository.findByOrder(any(Order.class)))
                .thenReturn(Optional.of(
                        OrderAddress.builder()
                                .order(new Order())
                                .fullName("Test User")
                                .phone("1234567890")
                                .addressLine1("Line 1")
                                .city("Chennai")
                                .state("Tamil Nadu")
                                .postalCode("600001")
                                .country("India")
                                .type(AddressType.HOME)
                                .build()
                ));

        when(productRepository.decrementStock(anyLong(), anyInt()))
                .thenReturn(1);

        OrderResponse response =
                orderService.placeOrder(1L, user);

        assertEquals(
                new BigDecimal("40.00"),
                response.totalAmount()
        );
    }

    @Test
    void cancelOrder_InvalidStatus_ThrowsOrderCancellationNotAllowedException() {

        Order order = new Order();
        order.setId(1L);
        order.setOrderStatus(OrderStatus.SHIPPED);

        when(orderRepository.findByIdAndUser(1L, user))
                .thenReturn(Optional.of(order));

        assertThrows(
                OrderCancellationNotAllowedException.class,
                () -> orderService.cancelOrder(1L, user)
        );
    }

    @Test
    void cancelOrder_ValidStatus_Succeeds() {

        Order order = new Order();
        order.setId(1L);
        order.setOrderStatus(OrderStatus.CONFIRMED);

        OrderItem item = new OrderItem();

        Product p = new Product();
        p.setId(1L);

        item.setProduct(p);
        item.setQuantity(2);

        when(orderRepository.findByIdAndUser(1L, user))
                .thenReturn(Optional.of(order));

        when(orderItemRepository.findByOrder(order))
                .thenReturn(List.of(item));

        orderService.cancelOrder(1L, user);

        verify(productRepository)
                .incrementStock(1L, 2);

        assertEquals(
                OrderStatus.CANCELLED,
                order.getOrderStatus()
        );
    }

    @Test
    void updateOrderStatus_ValidTransition_Succeeds() {

        Order order = new Order();
        order.setOrderStatus(OrderStatus.PLACED);

        when(orderRepository.findById(1L))
                .thenReturn(Optional.of(order));

        orderService.updateOrderStatus(
                1L,
                OrderStatus.CONFIRMED
        );

        assertEquals(
                OrderStatus.CONFIRMED,
                order.getOrderStatus()
        );
    }

    @Test
    void updateOrderStatus_InvalidTransition_ThrowsException() {

        Order order = new Order();
        order.setOrderStatus(OrderStatus.DELIVERED);

        when(orderRepository.findById(1L))
                .thenReturn(Optional.of(order));

        assertThrows(
                InvalidOrderStatusTransitionException.class,
                () -> orderService.updateOrderStatus(
                        1L,
                        OrderStatus.PROCESSING
                )
        );
    }
}
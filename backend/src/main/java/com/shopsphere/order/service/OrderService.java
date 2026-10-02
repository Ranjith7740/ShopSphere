package com.shopsphere.order.service;

import com.shopsphere.address.entity.Address;
import com.shopsphere.address.repository.AddressRepository;
import com.shopsphere.cart.entity.Cart;
import com.shopsphere.cart.entity.CartItem;
import com.shopsphere.cart.repository.CartItemRepository;
import com.shopsphere.cart.repository.CartRepository;
import com.shopsphere.exception.*;
import com.shopsphere.order.dto.*;
import com.shopsphere.order.entity.*;
import com.shopsphere.order.repository.*;
import com.shopsphere.product.entity.Product;
import com.shopsphere.product.entity.ProductStatus;
import com.shopsphere.product.repository.ProductRepository;
import com.shopsphere.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderAddressRepository orderAddressRepository;
    private final ProductRepository productRepository;
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final AddressRepository addressRepository;

    @Transactional
    public OrderResponse placeOrder(Long addressId, User user) {
        // 1. Load User's Cart
        Cart cart = cartRepository.findByUser(user)
                .orElseThrow(() -> new EmptyCartException());

        List<CartItem> cartItems = cartItemRepository.findByCart(cart);
        if (cartItems.isEmpty()) {
            throw new EmptyCartException();
        }

        // 2. Resolve and Validate Address
        Address address = addressRepository.findByIdAndUserId(addressId, user.getId())
                .orElseThrow(() -> new AddressNotFoundException(addressId));

        // 3. Validate Products and Calculate Totals
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (CartItem item : cartItems) {
            Product product = item.getProduct();
            if (product.getStatus() != ProductStatus.ACTIVE) {
                throw new ProductUnavailableException(product.getId());
            }
            totalAmount = totalAmount.add(product.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
        }

        // 4. Mock Payment
        if (!processMockPayment(totalAmount)) {
            throw new PaymentFailedException("Payment failed for amount: " + totalAmount);
        }

        // 5. Create Order
        Order order = Order.builder()
                .user(user)
                .totalAmount(totalAmount)
                .orderStatus(OrderStatus.CONFIRMED)
                .paymentStatus(PaymentStatus.SUCCESS)
                .build();
        order = orderRepository.save(order);

        // 6. Create OrderItems
        for (CartItem item : cartItems) {
            Product product = item.getProduct();
            BigDecimal unitPrice = product.getPrice();
            BigDecimal subtotal = unitPrice.multiply(BigDecimal.valueOf(item.getQuantity()));

            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .product(product)
                    .quantity(item.getQuantity())
                    .unitPrice(unitPrice)
                    .subtotal(subtotal)
                    .build();
            orderItemRepository.save(orderItem);
        }

        // 7. Create OrderAddress snapshot
        OrderAddress orderAddress = OrderAddress.builder()
                .order(order)
                .fullName(address.getFullName())
                .phone(address.getPhone())
                .addressLine1(address.getAddressLine1())
                .addressLine2(address.getAddressLine2())
                .city(address.getCity())
                .state(address.getState())
                .postalCode(address.getPostalCode())
                .country(address.getCountry())
                .type(address.getType())
                .build();
        orderAddressRepository.save(orderAddress);

        // 8. Atomic Inventory Deduction
        for (CartItem item : cartItems) {
            int updatedRows = productRepository.decrementStock(item.getProduct().getId(), item.getQuantity());
            if (updatedRows == 0) {
                throw new InsufficientStockException(item.getProduct().getId(), item.getQuantity(), 0); // Simplified stock count
            }
        }

        // 9. Clear Cart
        cartItemRepository.deleteAll(cartItems);

        return mapToResponse(order);
    }

    @Transactional(readOnly = true)
    public Page<OrderResponse> getAllOrders(Pageable pageable) {
        return orderRepository.findAll(pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        return mapToResponse(order);
    }

    @Transactional(readOnly = true)
    public Page<OrderResponse> getUserOrders(User user, Pageable pageable) {
        return orderRepository.findByUser(user, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderDetail(Long orderId, User user) {
        Order order = orderRepository.findByIdAndUser(orderId, user)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        return mapToResponse(order);
    }

    @Transactional
    public void cancelOrder(Long orderId, User user) {
        Order order = orderRepository.findByIdAndUser(orderId, user)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        if (order.getOrderStatus() != OrderStatus.PLACED && order.getOrderStatus() != OrderStatus.CONFIRMED) {
            throw new OrderCancellationNotAllowedException(orderId);
        }

        // Restore inventory
        List<OrderItem> items = orderItemRepository.findByOrder(order);
        for (OrderItem item : items) {
            productRepository.incrementStock(item.getProduct().getId(), item.getQuantity());
        }

        order.setOrderStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);
    }

    @Transactional
    public void updateOrderStatus(Long orderId, OrderStatus newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        OrderStatus currentStatus = order.getOrderStatus();
        if (!isValidTransition(currentStatus, newStatus)) {
            throw new InvalidOrderStatusTransitionException(currentStatus.name(), newStatus.name());
        }

        order.setOrderStatus(newStatus);
        orderRepository.save(order);
    }

    private boolean isValidTransition(OrderStatus from, OrderStatus to) {
        if (from == OrderStatus.PLACED) {
            return to == OrderStatus.CONFIRMED || to == OrderStatus.CANCELLED;
        }
        if (from == OrderStatus.CONFIRMED) {
            return to == OrderStatus.PROCESSING || to == OrderStatus.CANCELLED;
        }
        if (from == OrderStatus.PROCESSING) {
            return to == OrderStatus.SHIPPED;
        }
        if (from == OrderStatus.SHIPPED) {
            return to == OrderStatus.DELIVERED;
        }
        return false;
    }

    private boolean processMockPayment(BigDecimal amount) {
        // Mock: always return true for this implementation unless specifically needed otherwise
        return true;
    }

    private OrderResponse mapToResponse(Order order) {
        List<OrderItemResponse> itemResponses = orderItemRepository.findByOrder(order)
                .stream()
                .map(OrderItemResponse::fromEntity)
                .collect(Collectors.toList());

        OrderAddress address = orderAddressRepository.findByOrder(order)
                .orElseThrow(() -> new RuntimeException("Order address missing"));

        return OrderResponse.fromEntity(order, itemResponses, OrderAddressResponse.fromEntity(address));
    }
}

package com.shopsphere.order.controller;

import com.shopsphere.order.dto.OrderResponse;
import com.shopsphere.order.dto.PlaceOrderRequest;
import com.shopsphere.order.entity.OrderStatus;
import com.shopsphere.order.service.OrderService;
import com.shopsphere.user.entity.User;
import com.shopsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<OrderResponse> placeOrder(
            @RequestBody PlaceOrderRequest request,
            @AuthenticationPrincipal String email) {

        User user = getAuthenticatedUser(email);

        return ResponseEntity.ok(
                orderService.placeOrder(
                        request.addressId(),
                        user
                )
        );
    }

    @GetMapping
    public ResponseEntity<Page<OrderResponse>> getMyOrders(
            @AuthenticationPrincipal String email,
            @PageableDefault(
                    size = 10,
                    sort = "createdAt",
                    direction = Sort.Direction.DESC
            )
            Pageable pageable) {

        User user = getAuthenticatedUser(email);

        return ResponseEntity.ok(
                orderService.getUserOrders(user, pageable)
        );
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponse> getOrderDetail(
            @PathVariable Long orderId,
            @AuthenticationPrincipal String email) {

        User user = getAuthenticatedUser(email);

        return ResponseEntity.ok(
                orderService.getOrderDetail(
                        orderId,
                        user
                )
        );
    }

    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<Void> cancelOrder(
            @PathVariable Long orderId,
            @AuthenticationPrincipal String email) {

        User user = getAuthenticatedUser(email);

        orderService.cancelOrder(
                orderId,
                user
        );

        return ResponseEntity.noContent().build();
    }

    private User getAuthenticatedUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Authenticated user not found"
                        )
                );
    }
}
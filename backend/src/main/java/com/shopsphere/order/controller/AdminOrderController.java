package com.shopsphere.order.controller;

import com.shopsphere.order.dto.OrderResponse;
import com.shopsphere.order.dto.OrderStatusUpdateRequest;
import com.shopsphere.order.entity.OrderStatus;
import com.shopsphere.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminOrderController {

    private final OrderService orderService;

    @GetMapping
    public ResponseEntity<Page<OrderResponse>> getAllOrders(
            @PageableDefault(size = 10) Pageable pageable) {
        // Note: OrderService needs a method for admin view
        return ResponseEntity.ok(orderService.getAllOrders(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Void> updateStatus(@PathVariable Long id,
                                           @RequestBody OrderStatusUpdateRequest request) {
        orderService.updateOrderStatus(id, OrderStatus.valueOf(request.status().toUpperCase()));
        return ResponseEntity.noContent().build();
    }
}

package com.shopsphere.order.dto;

import com.shopsphere.order.entity.OrderStatus;
import com.shopsphere.order.entity.PaymentStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record OrderResponse(
    Long id,
    BigDecimal totalAmount,
    PaymentStatus paymentStatus,
    OrderStatus orderStatus,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    List<OrderItemResponse> items,
    OrderAddressResponse shippingAddress
) {
    public static OrderResponse fromEntity(com.shopsphere.order.entity.Order order,
                                          List<OrderItemResponse> items,
                                          OrderAddressResponse address) {
        return new OrderResponse(
            order.getId(),
            order.getTotalAmount(),
            order.getPaymentStatus(),
            order.getOrderStatus(),
            order.getCreatedAt(),
            order.getUpdatedAt(),
            items,
            address
        );
    }
}

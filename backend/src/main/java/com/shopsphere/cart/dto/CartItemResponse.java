package com.shopsphere.cart.dto;

import com.shopsphere.cart.entity.CartItem;
import com.shopsphere.product.entity.Product;
import com.shopsphere.product.entity.ProductStatus;

import java.math.BigDecimal;

public record CartItemResponse(
        Long id,
        Long productId,
        String productName,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal subtotal,
        Integer availableStock,
        boolean productActive
) {
    public static CartItemResponse fromEntity(CartItem cartItem) {
        Product product = cartItem.getProduct();
        BigDecimal subtotal = product.getPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity()));
        return new CartItemResponse(
                cartItem.getId(),
                product.getId(),
                product.getName(),
                cartItem.getQuantity(),
                product.getPrice(),
                subtotal,
                product.getStockQuantity(),
                product.getStatus() == ProductStatus.ACTIVE
        );
    }
}

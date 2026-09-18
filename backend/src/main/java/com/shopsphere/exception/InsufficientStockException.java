package com.shopsphere.exception;

public class InsufficientStockException extends RuntimeException {

    public InsufficientStockException(Long productId, int requestedQuantity, int availableStock) {
        super("Requested quantity " + requestedQuantity + " for product id " + productId
                + " exceeds available stock of " + availableStock);
    }
}

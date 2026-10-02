package com.shopsphere.exception;

public class OrderCancellationNotAllowedException extends RuntimeException {
    public OrderCancellationNotAllowedException(Long id) {
        super("Order " + id + " cannot be cancelled in its current state");
    }
}

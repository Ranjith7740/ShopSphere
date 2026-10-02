package com.shopsphere.exception;

public class InvalidOrderStatusTransitionException extends RuntimeException {
    public InvalidOrderStatusTransitionException(String from, String to) {
        super("Invalid order status transition from " + from + " to " + to);
    }
}

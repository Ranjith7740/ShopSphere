package com.shopsphere.exception;

public class InactiveCategoryException extends RuntimeException {

    public InactiveCategoryException(Long categoryId) {
        super("Category with id " + categoryId + " is inactive and cannot be assigned to a product");
    }
}

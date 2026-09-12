package com.shopsphere.exception;

public class CategoryNotFoundException extends RuntimeException {

    public CategoryNotFoundException(Long id) {
        super("No category found with id: " + id);
    }
}

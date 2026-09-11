package com.shopsphere.exception;

public class UserNotFoundException extends RuntimeException {

    public UserNotFoundException(String email) {
        super("No user found with email: " + email);
    }
}

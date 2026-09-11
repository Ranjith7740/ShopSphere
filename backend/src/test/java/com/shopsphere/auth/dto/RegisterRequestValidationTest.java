package com.shopsphere.auth.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class RegisterRequestValidationTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    @Test
    void validRequest_hasNoViolations() {
        RegisterRequest request = new RegisterRequest("Test User", "test@example.com", "9876543210", "Password@123");
        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void blankName_isRejected() {
        RegisterRequest request = new RegisterRequest("", "test@example.com", "9876543210", "Password@123");
        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("name");
    }

    @Test
    void invalidEmail_isRejected() {
        RegisterRequest request = new RegisterRequest("Test User", "not-an-email", "9876543210", "Password@123");
        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("email");
    }

    @Test
    void weakPassword_isRejected() {
        RegisterRequest request = new RegisterRequest("Test User", "test@example.com", "9876543210", "weak");
        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("password");
    }

    @Test
    void invalidPhone_isRejected() {
        RegisterRequest request = new RegisterRequest("Test User", "test@example.com", "12345", "Password@123");
        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("phone");
    }
}

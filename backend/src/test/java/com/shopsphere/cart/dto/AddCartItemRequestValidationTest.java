package com.shopsphere.cart.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class AddCartItemRequestValidationTest {

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
        assertThat(validator.validate(new AddCartItemRequest(1L, 2))).isEmpty();
    }

    @Test
    void missingProductId_isRejected() {
        Set<ConstraintViolation<AddCartItemRequest>> violations =
                validator.validate(new AddCartItemRequest(null, 2));
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("productId");
    }

    @Test
    void missingQuantity_isRejected() {
        Set<ConstraintViolation<AddCartItemRequest>> violations =
                validator.validate(new AddCartItemRequest(1L, null));
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("quantity");
    }

    @Test
    void quantityBelowOne_isRejected() {
        Set<ConstraintViolation<AddCartItemRequest>> violations =
                validator.validate(new AddCartItemRequest(1L, 0));
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("quantity");
    }
}

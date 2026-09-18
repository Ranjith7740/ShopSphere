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

class UpdateCartItemRequestValidationTest {

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
        assertThat(validator.validate(new UpdateCartItemRequest(3))).isEmpty();
    }

    @Test
    void missingQuantity_isRejected() {
        Set<ConstraintViolation<UpdateCartItemRequest>> violations =
                validator.validate(new UpdateCartItemRequest(null));
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("quantity");
    }

    @Test
    void quantityBelowOne_isRejected() {
        Set<ConstraintViolation<UpdateCartItemRequest>> violations =
                validator.validate(new UpdateCartItemRequest(0));
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("quantity");
    }
}

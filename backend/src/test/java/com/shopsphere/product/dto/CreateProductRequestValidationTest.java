package com.shopsphere.product.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class CreateProductRequestValidationTest {

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

    private CreateProductRequest validRequest() {
        return new CreateProductRequest(1L, "Phone", "desc", new BigDecimal("79999.00"), 25);
    }

    @Test
    void validRequest_hasNoViolations() {
        assertThat(validator.validate(validRequest())).isEmpty();
    }

    @Test
    void missingCategoryId_isRejected() {
        CreateProductRequest request = new CreateProductRequest(null, "Phone", "desc", new BigDecimal("79999.00"), 25);
        Set<ConstraintViolation<CreateProductRequest>> violations = validator.validate(request);
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("categoryId");
    }

    @Test
    void blankName_isRejected() {
        CreateProductRequest request = new CreateProductRequest(1L, "", "desc", new BigDecimal("79999.00"), 25);
        Set<ConstraintViolation<CreateProductRequest>> violations = validator.validate(request);
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("name");
    }

    @Test
    void negativePrice_isRejected() {
        CreateProductRequest request = new CreateProductRequest(1L, "Phone", "desc", new BigDecimal("-100"), 25);
        Set<ConstraintViolation<CreateProductRequest>> violations = validator.validate(request);
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("price");
    }

    @Test
    void priceWithTooManyDecimalPlaces_isRejected() {
        CreateProductRequest request = new CreateProductRequest(1L, "Phone", "desc", new BigDecimal("799.999"), 25);
        Set<ConstraintViolation<CreateProductRequest>> violations = validator.validate(request);
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("price");
    }

    @Test
    void negativeStock_isRejected() {
        CreateProductRequest request = new CreateProductRequest(1L, "Phone", "desc", new BigDecimal("79999.00"), -1);
        Set<ConstraintViolation<CreateProductRequest>> violations = validator.validate(request);
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("stockQuantity");
    }

    @Test
    void zeroPriceAndStock_areAllowed() {
        CreateProductRequest request = new CreateProductRequest(1L, "Phone", "desc", BigDecimal.ZERO, 0);
        assertThat(validator.validate(request)).isEmpty();
    }
}

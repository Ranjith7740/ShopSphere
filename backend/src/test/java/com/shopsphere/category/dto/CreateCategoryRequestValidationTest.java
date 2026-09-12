package com.shopsphere.category.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class CreateCategoryRequestValidationTest {

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
        CreateCategoryRequest request = new CreateCategoryRequest("Electronics", "Gadgets");
        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void blankName_isRejected() {
        CreateCategoryRequest request = new CreateCategoryRequest("", "Gadgets");
        Set<ConstraintViolation<CreateCategoryRequest>> violations = validator.validate(request);
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("name");
    }

    @Test
    void nullDescription_isAllowed() {
        CreateCategoryRequest request = new CreateCategoryRequest("Electronics", null);
        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void nameOverMaxLength_isRejected() {
        CreateCategoryRequest request = new CreateCategoryRequest("A".repeat(256), "Gadgets");
        Set<ConstraintViolation<CreateCategoryRequest>> violations = validator.validate(request);
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("name");
    }
}

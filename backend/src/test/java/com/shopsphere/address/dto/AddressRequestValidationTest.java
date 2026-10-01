package com.shopsphere.address.dto;

import com.shopsphere.address.entity.AddressType;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class AddressRequestValidationTest {

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

    private AddressRequest validRequest() {
        return new AddressRequest(
                "Customer Name",
                "9876543210",
                "12 Example Street",
                "Near Example",
                "Chennai",
                "Tamil Nadu",
                "600001",
                "India",
                AddressType.HOME,
                true
        );
    }

    @Test
    void validRequest_hasNoViolations() {
        assertThat(validator.validate(validRequest())).isEmpty();
    }

    @Test
    void blankFullName_isRejected() {
        AddressRequest request = new AddressRequest("", "9876543210", "12 Example Street", null,
                "Chennai", "Tamil Nadu", "600001", "India", AddressType.HOME, false);
        Set<ConstraintViolation<AddressRequest>> violations = validator.validate(request);
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("fullName");
    }

    @Test
    void invalidPhone_isRejected() {
        AddressRequest request = new AddressRequest("Customer Name", "12345", "12 Example Street", null,
                "Chennai", "Tamil Nadu", "600001", "India", AddressType.HOME, false);
        Set<ConstraintViolation<AddressRequest>> violations = validator.validate(request);
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("phone");
    }

    @Test
    void blankAddressLine1_isRejected() {
        AddressRequest request = new AddressRequest("Customer Name", "9876543210", "", null,
                "Chennai", "Tamil Nadu", "600001", "India", AddressType.HOME, false);
        Set<ConstraintViolation<AddressRequest>> violations = validator.validate(request);
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("addressLine1");
    }

    @Test
    void missingAddressLine2_isAccepted() {
        AddressRequest request = new AddressRequest("Customer Name", "9876543210", "12 Example Street", null,
                "Chennai", "Tamil Nadu", "600001", "India", AddressType.HOME, false);
        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void blankCity_isRejected() {
        AddressRequest request = new AddressRequest("Customer Name", "9876543210", "12 Example Street", null,
                "", "Tamil Nadu", "600001", "India", AddressType.HOME, false);
        Set<ConstraintViolation<AddressRequest>> violations = validator.validate(request);
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("city");
    }

    @Test
    void blankState_isRejected() {
        AddressRequest request = new AddressRequest("Customer Name", "9876543210", "12 Example Street", null,
                "Chennai", "", "600001", "India", AddressType.HOME, false);
        Set<ConstraintViolation<AddressRequest>> violations = validator.validate(request);
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("state");
    }

    @Test
    void blankPostalCode_isRejected() {
        AddressRequest request = new AddressRequest("Customer Name", "9876543210", "12 Example Street", null,
                "Chennai", "Tamil Nadu", "", "India", AddressType.HOME, false);
        Set<ConstraintViolation<AddressRequest>> violations = validator.validate(request);
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("postalCode");
    }

    @Test
    void blankCountry_isRejected() {
        AddressRequest request = new AddressRequest("Customer Name", "9876543210", "12 Example Street", null,
                "Chennai", "Tamil Nadu", "600001", "", AddressType.HOME, false);
        Set<ConstraintViolation<AddressRequest>> violations = validator.validate(request);
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("country");
    }

    @Test
    void missingType_isRejected() {
        AddressRequest request = new AddressRequest("Customer Name", "9876543210", "12 Example Street", null,
                "Chennai", "Tamil Nadu", "600001", "India", null, false);
        Set<ConstraintViolation<AddressRequest>> violations = validator.validate(request);
        assertThat(violations).extracting(v -> v.getPropertyPath().toString()).contains("type");
    }
}

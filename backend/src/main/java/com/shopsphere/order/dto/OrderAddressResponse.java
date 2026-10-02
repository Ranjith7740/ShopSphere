package com.shopsphere.order.dto;

public record OrderAddressResponse(
    String fullName,
    String phone,
    String addressLine1,
    String addressLine2,
    String city,
    String state,
    String postalCode,
    String country,
    String type
) {
    public static OrderAddressResponse fromEntity(com.shopsphere.order.entity.OrderAddress address) {
        return new OrderAddressResponse(
            address.getFullName(),
            address.getPhone(),
            address.getAddressLine1(),
            address.getAddressLine2(),
            address.getCity(),
            address.getState(),
            address.getPostalCode(),
            address.getCountry(),
            address.getType().name()
        );
    }
}

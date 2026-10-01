package com.shopsphere.exception;

// Also thrown when the address exists but belongs to another user - deliberately
// indistinguishable from a missing address, so a customer can never confirm the
// existence of someone else's address.
public class AddressNotFoundException extends RuntimeException {

    public AddressNotFoundException(Long addressId) {
        super("No address found with id: " + addressId);
    }
}

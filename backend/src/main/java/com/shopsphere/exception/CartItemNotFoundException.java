package com.shopsphere.exception;

// Also thrown when the item exists but belongs to another user's cart -
// deliberately indistinguishable from a missing item, so a customer can
// never confirm the existence of someone else's cart item.
public class CartItemNotFoundException extends RuntimeException {

    public CartItemNotFoundException(Long cartItemId) {
        super("No cart item found with id: " + cartItemId);
    }
}

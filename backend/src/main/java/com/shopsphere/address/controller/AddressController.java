package com.shopsphere.address.controller;

import com.shopsphere.address.dto.AddressRequest;
import com.shopsphere.address.dto.AddressResponse;
import com.shopsphere.address.service.AddressService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Every operation resolves the owning addresses from the JWT subject (via
 * AddressService) - never from a client-supplied id - so a customer can only
 * ever act on their own addresses, matching UserController/CartController's
 * convention. Covered by SecurityConfig's anyRequest().authenticated() rule;
 * no SecurityConfig change is needed for this controller.
 */
@RestController
@RequestMapping("/api/users/me/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;

    @GetMapping
    public ResponseEntity<List<AddressResponse>> getAddresses(@AuthenticationPrincipal String email) {
        return ResponseEntity.ok(addressService.getAddresses(email));
    }

    @PostMapping
    public ResponseEntity<AddressResponse> createAddress(@AuthenticationPrincipal String email,
                                                            @Valid @RequestBody AddressRequest request) {
        return ResponseEntity.ok(addressService.createAddress(email, request));
    }

    @PutMapping("/{addressId}")
    public ResponseEntity<AddressResponse> updateAddress(@AuthenticationPrincipal String email,
                                                            @PathVariable Long addressId,
                                                            @Valid @RequestBody AddressRequest request) {
        return ResponseEntity.ok(addressService.updateAddress(email, addressId, request));
    }

    @DeleteMapping("/{addressId}")
    public ResponseEntity<Void> deleteAddress(@AuthenticationPrincipal String email,
                                                @PathVariable Long addressId) {
        addressService.deleteAddress(email, addressId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{addressId}/default")
    public ResponseEntity<AddressResponse> setDefaultAddress(@AuthenticationPrincipal String email,
                                                                @PathVariable Long addressId) {
        return ResponseEntity.ok(addressService.setDefaultAddress(email, addressId));
    }
}

package com.shopsphere.address.service;

import com.shopsphere.address.dto.AddressRequest;
import com.shopsphere.address.dto.AddressResponse;
import com.shopsphere.address.entity.Address;
import com.shopsphere.address.repository.AddressRepository;
import com.shopsphere.exception.AddressNotFoundException;
import com.shopsphere.exception.UserNotFoundException;
import com.shopsphere.user.entity.User;
import com.shopsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AddressService {

    private final AddressRepository addressRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<AddressResponse> getAddresses(String email) {
        User user = findUserByEmail(email);
        return addressRepository.findByUserId(user.getId()).stream()
                .map(AddressResponse::fromEntity)
                .toList();
    }

    @Transactional
    public AddressResponse createAddress(String email, AddressRequest request) {
        User user = findUserByEmail(email);
        boolean hasExistingAddresses = addressRepository.countByUserId(user.getId()) > 0;

        Address address = new Address();
        address.setUser(user);
        applyRequest(address, request);

        boolean shouldBeDefault = !hasExistingAddresses || request.defaultRequested();
        if (hasExistingAddresses && shouldBeDefault) {
            clearCurrentDefault(user.getId());
        }
        address.setDefault(shouldBeDefault);

        return AddressResponse.fromEntity(addressRepository.save(address));
    }

    @Transactional
    public AddressResponse updateAddress(String email, Long addressId, AddressRequest request) {
        User user = findUserByEmail(email);
        Address address = findOwnedAddress(addressId, user.getId());

        applyRequest(address, request);

        if (request.defaultRequested() && !address.isDefault()) {
            clearCurrentDefault(user.getId());
            address.setDefault(true);
        }

        return AddressResponse.fromEntity(addressRepository.save(address));
    }

    @Transactional
    public void deleteAddress(String email, Long addressId) {
        User user = findUserByEmail(email);
        Address address = findOwnedAddress(addressId, user.getId());
        boolean wasDefault = address.isDefault();

        addressRepository.delete(address);

        if (wasDefault) {
            // Deterministic replacement: the oldest remaining address becomes default.
            addressRepository.findByUserId(user.getId()).stream()
                    .min(Comparator.comparing(Address::getCreatedAt))
                    .ifPresent(oldest -> {
                        oldest.setDefault(true);
                        addressRepository.save(oldest);
                    });
        }
    }

    @Transactional
    public AddressResponse setDefaultAddress(String email, Long addressId) {
        User user = findUserByEmail(email);
        Address address = findOwnedAddress(addressId, user.getId());

        if (!address.isDefault()) {
            clearCurrentDefault(user.getId());
            address.setDefault(true);
            addressRepository.save(address);
        }

        return AddressResponse.fromEntity(address);
    }

    private void clearCurrentDefault(Long userId) {
        addressRepository.findByUserIdAndIsDefaultTrue(userId)
                .ifPresent(current -> {
                    current.setDefault(false);
                    addressRepository.save(current);
                });
    }

    private void applyRequest(Address address, AddressRequest request) {
        address.setFullName(request.fullName());
        address.setPhone(request.phone());
        address.setAddressLine1(request.addressLine1());
        address.setAddressLine2(request.addressLine2());
        address.setCity(request.city());
        address.setState(request.state());
        address.setPostalCode(request.postalCode());
        address.setCountry(request.country());
        address.setType(request.type());
    }

    private Address findOwnedAddress(Long addressId, Long userId) {
        return addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new AddressNotFoundException(addressId));
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException(email));
    }
}

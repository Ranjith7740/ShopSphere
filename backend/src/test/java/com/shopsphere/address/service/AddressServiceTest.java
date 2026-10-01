package com.shopsphere.address.service;

import com.shopsphere.address.dto.AddressRequest;
import com.shopsphere.address.dto.AddressResponse;
import com.shopsphere.address.entity.Address;
import com.shopsphere.address.entity.AddressType;
import com.shopsphere.address.repository.AddressRepository;
import com.shopsphere.exception.AddressNotFoundException;
import com.shopsphere.user.entity.Role;
import com.shopsphere.user.entity.User;
import com.shopsphere.user.entity.UserStatus;
import com.shopsphere.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AddressServiceTest {

    @Mock
    private AddressRepository addressRepository;

    @Mock
    private UserRepository userRepository;

    private AddressService addressService;

    private static final String EMAIL = "customer@example.com";

    @BeforeEach
    void setUp() {
        addressService = new AddressService(addressRepository, userRepository);
    }

    private User user(Long id, String email) {
        User user = new User();
        user.setId(id);
        user.setName("Test User");
        user.setEmail(email);
        user.setRole(Role.CUSTOMER);
        user.setStatus(UserStatus.ACTIVE);
        return user;
    }

    private Address address(Long id, User owner, boolean isDefault, LocalDateTime createdAt) {
        Address address = new Address();
        address.setId(id);
        address.setUser(owner);
        address.setFullName("Customer Name");
        address.setPhone("9876543210");
        address.setAddressLine1("12 Example Street");
        address.setCity("Chennai");
        address.setState("Tamil Nadu");
        address.setPostalCode("600001");
        address.setCountry("India");
        address.setType(AddressType.HOME);
        address.setDefault(isDefault);
        address.setCreatedAt(createdAt);
        return address;
    }

    private AddressRequest request(boolean isDefault) {
        return new AddressRequest("Customer Name", "9876543210", "12 Example Street", null,
                "Chennai", "Tamil Nadu", "600001", "India", AddressType.HOME, isDefault);
    }

    @Test
    void getAddresses_returnsOwnAddressesOnly() {
        User user = user(1L, EMAIL);
        Address address = address(10L, user, true, LocalDateTime.now());
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(addressRepository.findByUserId(1L)).thenReturn(List.of(address));

        List<AddressResponse> responses = addressService.getAddresses(EMAIL);

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).id()).isEqualTo(10L);
    }

    @Test
    void createAddress_firstAddress_becomesDefaultAutomatically() {
        User user = user(1L, EMAIL);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(addressRepository.countByUserId(1L)).thenReturn(0L);
        when(addressRepository.save(any(Address.class))).thenAnswer(invocation -> {
            Address saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        AddressResponse response = addressService.createAddress(EMAIL, request(false));

        assertThat(response.isDefault()).isTrue();
        verify(addressRepository, never()).findByUserIdAndIsDefaultTrue(any());
    }

    @Test
    void createAddress_notFirstAndNotMarkedDefault_keepsExistingDefault() {
        User user = user(1L, EMAIL);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(addressRepository.countByUserId(1L)).thenReturn(1L);
        when(addressRepository.save(any(Address.class))).thenAnswer(invocation -> {
            Address saved = invocation.getArgument(0);
            saved.setId(2L);
            return saved;
        });

        AddressResponse response = addressService.createAddress(EMAIL, request(false));

        assertThat(response.isDefault()).isFalse();
        verify(addressRepository, never()).findByUserIdAndIsDefaultTrue(any());
    }

    @Test
    void createAddress_explicitlyMarkedDefault_replacesExistingDefault() {
        User user = user(1L, EMAIL);
        Address existingDefault = address(1L, user, true, LocalDateTime.now().minusDays(1));
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(addressRepository.countByUserId(1L)).thenReturn(1L);
        when(addressRepository.findByUserIdAndIsDefaultTrue(1L)).thenReturn(Optional.of(existingDefault));
        when(addressRepository.save(any(Address.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AddressResponse response = addressService.createAddress(EMAIL, request(true));

        assertThat(existingDefault.isDefault()).isFalse();
        assertThat(response.isDefault()).isTrue();
        verify(addressRepository).save(existingDefault);
    }

    @Test
    void updateAddress_ownedAddress_updatesFields() {
        User user = user(1L, EMAIL);
        Address existing = address(1L, user, false, LocalDateTime.now());
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(addressRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(existing));
        when(addressRepository.save(any(Address.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AddressRequest updateRequest = new AddressRequest("New Name", "9876543211", "New Street", "Landmark",
                "Mumbai", "Maharashtra", "400001", "India", AddressType.WORK, false);

        AddressResponse response = addressService.updateAddress(EMAIL, 1L, updateRequest);

        assertThat(response.fullName()).isEqualTo("New Name");
        assertThat(response.city()).isEqualTo("Mumbai");
        assertThat(response.type()).isEqualTo(AddressType.WORK);
    }

    @Test
    void updateAddress_markingDefault_replacesExistingDefault() {
        User user = user(1L, EMAIL);
        Address existingDefault = address(2L, user, true, LocalDateTime.now().minusDays(1));
        Address target = address(1L, user, false, LocalDateTime.now());
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(addressRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(target));
        when(addressRepository.findByUserIdAndIsDefaultTrue(1L)).thenReturn(Optional.of(existingDefault));
        when(addressRepository.save(any(Address.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AddressResponse response = addressService.updateAddress(EMAIL, 1L, request(true));

        assertThat(existingDefault.isDefault()).isFalse();
        assertThat(response.isDefault()).isTrue();
    }

    @Test
    void updateAddress_anotherUsersAddress_throwsNotFound() {
        User user = user(1L, EMAIL);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(addressRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.empty());

        assertThrows(AddressNotFoundException.class,
                () -> addressService.updateAddress(EMAIL, 1L, request(false)));

        verify(addressRepository, never()).save(any());
    }

    @Test
    void deleteAddress_notDefault_removesWithoutReassigningDefault() {
        User user = user(1L, EMAIL);
        Address target = address(1L, user, false, LocalDateTime.now());
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(addressRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(target));

        addressService.deleteAddress(EMAIL, 1L);

        verify(addressRepository).delete(target);
        verify(addressRepository, never()).findByUserId(any());
    }

    @Test
    void deleteAddress_default_withRemainingAddresses_selectsOldestAsNewDefault() {
        User user = user(1L, EMAIL);
        Address target = address(1L, user, true, LocalDateTime.now());
        Address older = address(2L, user, false, LocalDateTime.now().minusDays(2));
        Address newer = address(3L, user, false, LocalDateTime.now().minusDays(1));

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(addressRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(target));
        when(addressRepository.findByUserId(1L)).thenReturn(List.of(older, newer));

        addressService.deleteAddress(EMAIL, 1L);

        verify(addressRepository).delete(target);
        ArgumentCaptor<Address> captor = ArgumentCaptor.forClass(Address.class);
        verify(addressRepository).save(captor.capture());
        assertThat(captor.getValue()).isEqualTo(older);
        assertThat(older.isDefault()).isTrue();
    }

    @Test
    void deleteAddress_onlyAddress_leavesNoDefault() {
        User user = user(1L, EMAIL);
        Address target = address(1L, user, true, LocalDateTime.now());

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(addressRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(target));
        when(addressRepository.findByUserId(1L)).thenReturn(List.of());

        addressService.deleteAddress(EMAIL, 1L);

        verify(addressRepository).delete(target);
        verify(addressRepository, never()).save(any());
    }

    @Test
    void deleteAddress_anotherUsersAddress_throwsNotFoundAndNeverDeletes() {
        User user = user(1L, EMAIL);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(addressRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.empty());

        assertThrows(AddressNotFoundException.class, () -> addressService.deleteAddress(EMAIL, 1L));

        verify(addressRepository, never()).delete(any());
    }

    @Test
    void setDefaultAddress_marksTargetAndUnmarksPreviousDefault() {
        User user = user(1L, EMAIL);
        Address previousDefault = address(2L, user, true, LocalDateTime.now());
        Address target = address(1L, user, false, LocalDateTime.now());

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(addressRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(target));
        when(addressRepository.findByUserIdAndIsDefaultTrue(1L)).thenReturn(Optional.of(previousDefault));

        AddressResponse response = addressService.setDefaultAddress(EMAIL, 1L);

        assertThat(previousDefault.isDefault()).isFalse();
        assertThat(response.isDefault()).isTrue();
        verify(addressRepository).save(previousDefault);
        verify(addressRepository).save(target);
    }

    @Test
    void setDefaultAddress_anotherUsersAddress_throwsNotFound() {
        User user = user(1L, EMAIL);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(addressRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.empty());

        assertThrows(AddressNotFoundException.class, () -> addressService.setDefaultAddress(EMAIL, 1L));

        verify(addressRepository, never()).save(any());
    }

    @Test
    void setDefaultAddress_alreadyDefault_isNoOp() {
        User user = user(1L, EMAIL);
        Address target = address(1L, user, true, LocalDateTime.now());

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(addressRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(target));

        addressService.setDefaultAddress(EMAIL, 1L);

        verify(addressRepository, never()).save(any());
        verify(addressRepository, never()).findByUserIdAndIsDefaultTrue(any());
    }
}

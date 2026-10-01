package com.shopsphere.address;

import com.shopsphere.address.entity.Address;
import com.shopsphere.address.entity.AddressType;
import com.shopsphere.address.repository.AddressRepository;
import com.shopsphere.security.service.JwtService;
import com.shopsphere.user.entity.Role;
import com.shopsphere.user.entity.User;
import com.shopsphere.user.entity.UserStatus;
import com.shopsphere.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies address access end to end through the real Spring Security filter
 * chain, same approach as CartAuthorizationTest: authentication is required,
 * and ownership is derived only from the JWT subject - a customer can never
 * reach another customer's address.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AddressAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockitoBean
    private AddressRepository addressRepository;

    @MockitoBean
    private UserRepository userRepository;

    private User user(Long id, String email) {
        User user = new User();
        user.setId(id);
        user.setName("Test User");
        user.setEmail(email);
        user.setPhone("9876543210");
        user.setRole(Role.CUSTOMER);
        user.setStatus(UserStatus.ACTIVE);
        return user;
    }

    private String tokenFor(String email) {
        return jwtService.generateToken(user(1L, email));
    }

    private Address address(Long id, User owner) {
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
        address.setDefault(true);
        address.setCreatedAt(LocalDateTime.now());
        return address;
    }

    private static final String VALID_BODY = "{\"fullName\":\"Customer Name\",\"phone\":\"9876543210\","
            + "\"addressLine1\":\"12 Example Street\",\"city\":\"Chennai\",\"state\":\"Tamil Nadu\","
            + "\"postalCode\":\"600001\",\"country\":\"India\",\"type\":\"HOME\",\"isDefault\":false}";

    @Test
    void getAddresses_withoutToken_isUnauthorized() throws Exception {
        mockMvc.perform(get("/api/users/me/addresses"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getAddresses_withToken_returnsOwnAddresses() throws Exception {
        String email = "alice@example.com";
        User owner = user(1L, email);
        Address address = address(10L, owner);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(owner));
        when(addressRepository.findByUserId(1L)).thenReturn(List.of(address));

        mockMvc.perform(get("/api/users/me/addresses")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(10));
    }

    @Test
    void createAddress_invalidRequest_isBadRequest() throws Exception {
        String email = "alice@example.com";
        mockMvc.perform(post("/api/users/me/addresses")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(email))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateAddress_belongingToAnotherCustomer_isNotFound() throws Exception {
        String requesterEmail = "bob@example.com";
        User requester = user(2L, requesterEmail);
        when(userRepository.findByEmail(requesterEmail)).thenReturn(Optional.of(requester));
        when(addressRepository.findByIdAndUserId(5L, 2L)).thenReturn(Optional.empty());

        mockMvc.perform(put("/api/users/me/addresses/5")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(requesterEmail))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteAddress_belongingToAnotherCustomer_isNotFound() throws Exception {
        String requesterEmail = "bob@example.com";
        User requester = user(2L, requesterEmail);
        when(userRepository.findByEmail(requesterEmail)).thenReturn(Optional.of(requester));
        when(addressRepository.findByIdAndUserId(5L, 2L)).thenReturn(Optional.empty());

        mockMvc.perform(delete("/api/users/me/addresses/5")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(requesterEmail)))
                .andExpect(status().isNotFound());

        verify(addressRepository, never()).delete(any());
    }

    @Test
    void setDefault_belongingToAnotherCustomer_isNotFound() throws Exception {
        String requesterEmail = "bob@example.com";
        User requester = user(2L, requesterEmail);
        when(userRepository.findByEmail(requesterEmail)).thenReturn(Optional.of(requester));
        when(addressRepository.findByIdAndUserId(5L, 2L)).thenReturn(Optional.empty());

        mockMvc.perform(put("/api/users/me/addresses/5/default")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(requesterEmail)))
                .andExpect(status().isNotFound());
    }

    @Test
    void createAddress_successfulAdd_returnsOkAsDefault() throws Exception {
        String email = "alice@example.com";
        User owner = user(1L, email);

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(owner));
        when(addressRepository.countByUserId(1L)).thenReturn(0L);
        when(addressRepository.save(any(Address.class))).thenAnswer(invocation -> {
            Address saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        mockMvc.perform(post("/api/users/me/addresses")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(email))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isDefault").value(true));
    }

    @Test
    void deleteAddress_ownedAddress_isNoContent() throws Exception {
        String email = "alice@example.com";
        User owner = user(1L, email);
        Address target = address(5L, owner);
        target.setDefault(false);

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(owner));
        when(addressRepository.findByIdAndUserId(5L, 1L)).thenReturn(Optional.of(target));

        mockMvc.perform(delete("/api/users/me/addresses/5")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(email)))
                .andExpect(status().isNoContent());
    }
}

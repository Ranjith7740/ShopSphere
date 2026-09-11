package com.shopsphere.auth.service;

import com.shopsphere.auth.dto.RegisterRequest;
import com.shopsphere.exception.DuplicateEmailException;
import com.shopsphere.security.service.JwtService;
import com.shopsphere.user.dto.UserResponse;
import com.shopsphere.user.entity.Role;
import com.shopsphere.user.entity.User;
import com.shopsphere.user.entity.UserStatus;
import com.shopsphere.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    private AuthService authService;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, authenticationManager, jwtService);
    }

    private RegisterRequest validRequest() {
        return new RegisterRequest("Test User", "test@example.com", "9876543210", "Password@123");
    }

    @Test
    void register_withNewEmail_savesUserWithCustomerRoleAndActiveStatus() {
        RegisterRequest request = validRequest();
        when(userRepository.existsByEmail(request.email())).thenReturn(false);
        when(passwordEncoder.encode(request.password())).thenReturn("hashed-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(1L);
            return user;
        });

        UserResponse response = authService.register(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();

        assertThat(saved.getRole()).isEqualTo(Role.CUSTOMER);
        assertThat(saved.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(response.role()).isEqualTo(Role.CUSTOMER);
    }

    @Test
    void register_hashesPasswordAndNeverPersistsPlaintext() {
        RegisterRequest request = validRequest();
        when(userRepository.existsByEmail(request.email())).thenReturn(false);
        when(passwordEncoder.encode(request.password())).thenReturn("hashed-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        authService.register(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getPassword())
                .isEqualTo("hashed-password")
                .isNotEqualTo(request.password());
    }

    @Test
    void register_responseNeverExposesPassword() {
        RegisterRequest request = validRequest();
        when(userRepository.existsByEmail(request.email())).thenReturn(false);
        when(passwordEncoder.encode(request.password())).thenReturn("hashed-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(1L);
            return user;
        });

        UserResponse response = authService.register(request);

        // UserResponse has no password accessor at all - this asserts the DTO's field set directly.
        assertThat(response.getClass().getRecordComponents())
                .extracting(java.lang.reflect.RecordComponent::getName)
                .doesNotContain("password");
    }

    @Test
    void register_duplicateEmail_throwsAndNeverSaves() {
        RegisterRequest request = validRequest();
        when(userRepository.existsByEmail(request.email())).thenReturn(true);

        assertThrows(DuplicateEmailException.class, () -> authService.register(request));

        verify(userRepository, never()).save(any());
    }
}

package com.shopsphere.auth.service;

import com.shopsphere.auth.dto.LoginRequest;
import com.shopsphere.auth.dto.LoginResponse;
import com.shopsphere.security.service.CustomUserDetailsService;
import com.shopsphere.security.service.JwtService;
import com.shopsphere.user.entity.Role;
import com.shopsphere.user.entity.User;
import com.shopsphere.user.entity.UserStatus;
import com.shopsphere.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Exercises the real authentication chain (CustomUserDetailsService + DaoAuthenticationProvider
 * + BCryptPasswordEncoder) rather than mocking AuthenticationManager, so the actual
 * "find by email -> check status -> check password" behavior is verified end to end.
 * Only the repository is mocked.
 */
@ExtendWith(MockitoExtension.class)
class LoginFlowTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtService jwtService;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private AuthService authService;

    private static final String RAW_PASSWORD = "Password@123";

    @BeforeEach
    void setUp() {
        CustomUserDetailsService userDetailsService = new CustomUserDetailsService(userRepository);
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        AuthenticationManager authenticationManager = new ProviderManager(provider);

        authService = new AuthService(userRepository, passwordEncoder, authenticationManager, jwtService);
    }

    private User activeUser() {
        User user = new User();
        user.setId(1L);
        user.setName("Test User");
        user.setEmail("test@example.com");
        user.setPassword(passwordEncoder.encode(RAW_PASSWORD));
        user.setPhone("9876543210");
        user.setRole(Role.CUSTOMER);
        user.setStatus(UserStatus.ACTIVE);
        return user;
    }

    @Test
    void login_withCorrectCredentials_issuesToken() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(activeUser()));
        when(jwtService.generateToken(any(User.class))).thenReturn("signed-jwt");
        when(jwtService.getExpirationMs()).thenReturn(3600000L);

        LoginResponse response = authService.login(new LoginRequest("test@example.com", RAW_PASSWORD));

        assertThat(response.accessToken()).isEqualTo("signed-jwt");
        assertThat(response.tokenType()).isEqualTo("Bearer");
    }

    @Test
    void login_withIncorrectPassword_throwsBadCredentials() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(activeUser()));

        assertThrows(BadCredentialsException.class,
                () -> authService.login(new LoginRequest("test@example.com", "WrongPassword@1")));
    }

    @Test
    void login_withUnknownEmail_throwsBadCredentials() {
        // DaoAuthenticationProvider hides UsernameNotFoundException behind BadCredentialsException
        // by default, so an unknown email can't be distinguished from a wrong password (no user enumeration).
        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());

        assertThrows(BadCredentialsException.class,
                () -> authService.login(new LoginRequest("missing@example.com", RAW_PASSWORD)));
    }

    @Test
    void login_withInactiveAccount_throwsDisabled() {
        User inactive = activeUser();
        inactive.setStatus(UserStatus.INACTIVE);
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(inactive));

        assertThrows(DisabledException.class,
                () -> authService.login(new LoginRequest("test@example.com", RAW_PASSWORD)));
    }
}

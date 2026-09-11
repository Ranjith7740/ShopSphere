package com.shopsphere.auth.service;

import com.shopsphere.auth.dto.LoginRequest;
import com.shopsphere.auth.dto.LoginResponse;
import com.shopsphere.auth.dto.RegisterRequest;
import com.shopsphere.exception.DuplicateEmailException;
import com.shopsphere.security.model.UserPrincipal;
import com.shopsphere.security.service.JwtService;
import com.shopsphere.user.dto.UserResponse;
import com.shopsphere.user.entity.Role;
import com.shopsphere.user.entity.User;
import com.shopsphere.user.entity.UserStatus;
import com.shopsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateEmailException(request.email());
        }

        User user = new User();
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPhone(request.phone());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(Role.CUSTOMER);
        user.setStatus(UserStatus.ACTIVE);

        User saved = userRepository.save(user);
        return UserResponse.fromEntity(saved);
    }

    /**
     * Authenticates the credentials via the AuthenticationManager, which delegates to
     * CustomUserDetailsService (find by email) and DaoAuthenticationProvider
     * (account-status check, then password check against the BCrypt hash),
     * then issues a JWT for the authenticated user.
     */
    public LoginResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        String token = jwtService.generateToken(principal.getUser());
        return new LoginResponse(token, "Bearer", jwtService.getExpirationMs());
    }
}

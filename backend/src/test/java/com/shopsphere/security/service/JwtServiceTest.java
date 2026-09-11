package com.shopsphere.security.service;

import com.shopsphere.user.entity.Role;
import com.shopsphere.user.entity.User;
import com.shopsphere.user.entity.UserStatus;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private static final String SECRET = "test-secret-key-for-shopsphere-unit-tests-only-32chars-min";

    private User sampleUser() {
        User user = new User();
        user.setId(1L);
        user.setName("Test User");
        user.setEmail("test@example.com");
        user.setRole(Role.CUSTOMER);
        user.setStatus(UserStatus.ACTIVE);
        return user;
    }

    @Test
    void generateToken_thenValidateAndExtractClaims_roundTrips() {
        JwtService jwtService = new JwtService(SECRET, 60_000);
        String token = jwtService.generateToken(sampleUser());

        assertThat(jwtService.isValid(token)).isTrue();
        assertThat(jwtService.extractEmail(token)).isEqualTo("test@example.com");
        assertThat(jwtService.extractRole(token)).isEqualTo("CUSTOMER");
    }

    @Test
    void isValid_withTamperedToken_returnsFalse() {
        JwtService jwtService = new JwtService(SECRET, 60_000);
        String token = jwtService.generateToken(sampleUser());
        String tampered = token.substring(0, token.length() - 2) + "xx";

        assertThat(jwtService.isValid(tampered)).isFalse();
    }

    @Test
    void isValid_withTokenSignedByDifferentSecret_returnsFalse() {
        JwtService issuedElsewhere = new JwtService("a-completely-different-secret-value-of-32chars", 60_000);
        String token = issuedElsewhere.generateToken(sampleUser());

        JwtService jwtService = new JwtService(SECRET, 60_000);
        assertThat(jwtService.isValid(token)).isFalse();
    }

    @Test
    void isValid_withExpiredToken_returnsFalse() {
        // Same secret, but issued with a negative expiration so it is already expired.
        JwtService expiredIssuer = new JwtService(SECRET, -1_000);
        String expiredToken = expiredIssuer.generateToken(sampleUser());

        JwtService jwtService = new JwtService(SECRET, 60_000);
        assertThat(jwtService.isValid(expiredToken)).isFalse();
    }

    @Test
    void isValid_withGarbageInput_returnsFalse() {
        JwtService jwtService = new JwtService(SECRET, 60_000);
        assertThat(jwtService.isValid("not-a-jwt")).isFalse();
    }
}

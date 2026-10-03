package com.shopsphere.user.service;

import com.shopsphere.user.dto.UserPageResponse;
import com.shopsphere.user.dto.UserResponse;
import com.shopsphere.user.entity.User;
import com.shopsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminUserService {
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public UserPageResponse getUsers(String search, Pageable pageable) {
        Page<User> userPage;

        if (search != null && !search.isBlank()) {
            userPage = userRepository.findByEmailContainingIgnoreCaseOrNameContainingIgnoreCase(
                search, search, pageable);
        } else {
            userPage = userRepository.findAll(pageable);
        }

        return new UserPageResponse(
            userPage.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList()),
            userPage.getTotalPages(),
            userPage.getTotalElements(),
            userPage.getSize(),
            userPage.getNumber()
        );
    }

    private UserResponse mapToResponse(User user) {
        return new UserResponse(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getPhone(),
            user.getRole()
        );
    }
}

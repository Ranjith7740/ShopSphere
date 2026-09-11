package com.shopsphere.user.service;

import com.shopsphere.exception.UserNotFoundException;
import com.shopsphere.user.dto.UpdateUserRequest;
import com.shopsphere.user.dto.UserResponse;
import com.shopsphere.user.entity.User;
import com.shopsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public UserResponse getCurrentUser(String email) {
        return UserResponse.fromEntity(findByEmail(email));
    }

    public UserResponse updateCurrentUser(String email, UpdateUserRequest request) {
        User user = findByEmail(email);
        user.setName(request.name());
        user.setPhone(request.phone());
        return UserResponse.fromEntity(userRepository.save(user));
    }

    private User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException(email));
    }
}

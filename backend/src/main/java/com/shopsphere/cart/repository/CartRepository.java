package com.shopsphere.cart.repository;

import com.shopsphere.cart.entity.Cart;
import com.shopsphere.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Long> {

    Optional<Cart> findByUserId(Long userId);

    Optional<Cart> findByUser(User user);
}

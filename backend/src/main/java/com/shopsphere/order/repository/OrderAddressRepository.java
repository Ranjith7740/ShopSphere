package com.shopsphere.order.repository;

import com.shopsphere.order.entity.OrderAddress;
import com.shopsphere.order.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrderAddressRepository extends JpaRepository<OrderAddress, Long> {
    Optional<OrderAddress> findByOrder(Order order);
}

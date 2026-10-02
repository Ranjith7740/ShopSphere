package com.shopsphere.order;

import com.shopsphere.address.entity.Address;
import com.shopsphere.address.repository.AddressRepository;
import com.shopsphere.cart.entity.Cart;
import com.shopsphere.cart.entity.CartItem;
import com.shopsphere.cart.repository.CartItemRepository;
import com.shopsphere.cart.repository.CartRepository;
import com.shopsphere.category.entity.Category;
import com.shopsphere.category.entity.CategoryStatus;
import com.shopsphere.category.repository.CategoryRepository;
import com.shopsphere.exception.InsufficientStockException;
import com.shopsphere.order.entity.Order;
import com.shopsphere.order.repository.OrderRepository;
import com.shopsphere.order.service.OrderService;
import com.shopsphere.product.entity.Product;
import com.shopsphere.product.entity.ProductStatus;
import com.shopsphere.product.repository.ProductRepository;
import com.shopsphere.user.entity.Role;
import com.shopsphere.user.entity.User;
import com.shopsphere.user.entity.UserStatus;
import com.shopsphere.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
class OrderConcurrencyTest {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private AddressRepository addressRepository;

    @Autowired
    private OrderService orderService;

    private User user;
    private Product product;
    private Address address;

    @BeforeEach
    void setUp() {
        // Clean database manually because @Transactional is intentionally
        // not used for the concurrency test.
        orderRepository.deleteAll();
        cartItemRepository.deleteAll();
        cartRepository.deleteAll();
        addressRepository.deleteAll();
        productRepository.deleteAll();
        categoryRepository.deleteAll();
        userRepository.deleteAll();

        user = new User();
        user.setName("Concurrent User");
        user.setEmail("concurrent@example.com");
        user.setPassword("pass");
        user.setRole(Role.CUSTOMER);
        user.setStatus(UserStatus.ACTIVE);
        user = userRepository.save(user);

        // Category must be persisted before it is assigned to Product.
        Category category = new Category();
        category.setName("Electronics");
        category.setStatus(CategoryStatus.ACTIVE);
        category = categoryRepository.save(category);

        product = new Product();
        product.setName("Limited Item");
        product.setPrice(BigDecimal.TEN);
        product.setStockQuantity(1);
        product.setStatus(ProductStatus.ACTIVE);
        product.setCategory(category);
        product = productRepository.save(product);

        address = new Address();
        address.setUser(user);
        address.setFullName("Name");
        address.setPhone("123");
        address.setAddressLine1("L1");
        address.setCity("C");
        address.setState("S");
        address.setPostalCode("P");
        address.setCountry("C");
        address.setType(com.shopsphere.address.entity.AddressType.HOME);
        address = addressRepository.save(address);

        Cart cart = new Cart();
        cart.setUser(user);
        cart = cartRepository.save(cart);

        CartItem item = new CartItem();
        item.setCart(cart);
        item.setProduct(product);
        item.setQuantity(1);
        cartItemRepository.save(item);
    }

    @Test
    void testConcurrentLastItemPurchase() throws InterruptedException {
        int threadCount = 10;

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(1);

        List<Callable<Boolean>> tasks = new ArrayList<>();

        for (int i = 0; i < threadCount; i++) {
            tasks.add(() -> {
                latch.await();

                try {
                    orderService.placeOrder(address.getId(), user);
                    return true;
                } catch (InsufficientStockException e) {
                    return false;
                } catch (Exception e) {
                    e.printStackTrace();
                    return false;
                }
            });
        }

        latch.countDown();

        List<Future<Boolean>> futures = executor.invokeAll(tasks);
        executor.shutdown();

        long successCount = futures.stream()
                .filter(future -> {
                    try {
                        return future.get();
                    } catch (Exception e) {
                        return false;
                    }
                })
                .count();

        assertEquals(
                1,
                successCount,
                "Exactly one order should succeed"
        );

        assertEquals(
                0,
                productRepository.findById(product.getId())
                        .orElseThrow()
                        .getStockQuantity()
        );

        assertEquals(1, orderRepository.count());
    }
}
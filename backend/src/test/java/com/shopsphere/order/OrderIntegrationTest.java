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
import com.shopsphere.order.dto.OrderResponse;
import com.shopsphere.order.entity.Order;
import com.shopsphere.order.entity.OrderAddress;
import com.shopsphere.order.repository.OrderAddressRepository;
import com.shopsphere.order.repository.OrderItemRepository;
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

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class OrderIntegrationTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private OrderAddressRepository orderAddressRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AddressRepository addressRepository;

    private User user;
    private Product product;
    private Address address;

    @BeforeEach
    void setUp() {

orderItemRepository.deleteAll();
    orderAddressRepository.deleteAll();
    orderRepository.deleteAll();
    cartItemRepository.deleteAll();
    cartRepository.deleteAll();
    productRepository.deleteAll();
    addressRepository.deleteAll();
    categoryRepository.deleteAll();
    userRepository.deleteAll();

    user = new User();
    user.setName("Test User");
    user.setEmail("test@example.com");
    user.setPassword("password");
    user.setRole(Role.CUSTOMER);
    user.setStatus(UserStatus.ACTIVE);
    user = userRepository.save(user);

    Category category = new Category();
    category.setName("Electronics");
    category.setStatus(CategoryStatus.ACTIVE);
    category = categoryRepository.save(category);

        product = new Product();
        product.setName("Test Product");
        product.setPrice(new BigDecimal("100.00"));
        product.setStockQuantity(10);
        product.setStatus(ProductStatus.ACTIVE);
        product.setCategory(category);
        product = productRepository.save(product);

        address = new Address();
        address.setFullName("Test Name");
        address.setPhone("1234567890");
        address.setAddressLine1("Line 1");
        address.setCity("City");
        address.setState("State");
        address.setPostalCode("12345");
        address.setCountry("Country");
        address.setType(com.shopsphere.address.entity.AddressType.HOME);
        address.setUser(user);
        address = addressRepository.save(address);

        Cart cart = new Cart();
        cart.setUser(user);
        cart = cartRepository.save(cart);

        CartItem item = new CartItem();
        item.setCart(cart);
        item.setProduct(product);
        item.setQuantity(2);
        cartItemRepository.save(item);
    }

    @Test
    void testSuccessfulOrderFlow() {
        OrderResponse response =
                orderService.placeOrder(address.getId(), user);

        assertNotNull(response);

        assertTrue(
                orderRepository.existsById(response.id())
        );

        assertEquals(
                8,
                productRepository.findById(product.getId())
                        .orElseThrow()
                        .getStockQuantity()
        );

        assertEquals(
                0,
                cartItemRepository.findByCart(
                        cartRepository.findByUser(user).orElseThrow()
                ).size()
        );
    }

    @Test
    void testPriceIntegrity() {

        // Change product price after it was added to the cart.
        product.setPrice(new BigDecimal("150.00"));
        product = productRepository.save(product);

        OrderResponse response =
                orderService.placeOrder(address.getId(), user);

        assertEquals(
                new BigDecimal("300.00"),
                response.totalAmount()
        );
    }

    @Test
    void testAddressSnapshot() {

        orderService.placeOrder(address.getId(), user);

        Order order = orderRepository.findAll().get(0);

        OrderAddress snapshot =
                orderAddressRepository.findByOrder(order).orElseThrow();

        String originalCity = snapshot.getCity();

        address.setCity("New City");
        addressRepository.save(address);

        assertEquals(
                originalCity,
                orderAddressRepository.findByOrder(order)
                        .orElseThrow()
                        .getCity()
        );
    }

    @Test
    void testAddressOwnership() {

        User userB = new User();
        userB.setName("User B");
        userB.setEmail("b@example.com");
        userB.setPassword("password");
        userB.setRole(Role.CUSTOMER);
        userB.setStatus(UserStatus.ACTIVE);
        userB = userRepository.save(userB);

        Address addressB = new Address();
        addressB.setUser(userB);
        addressB.setFullName("User B Name");
        addressB.setPhone("123");
        addressB.setAddressLine1("L1");
        addressB.setCity("C");
        addressB.setState("S");
        addressB.setPostalCode("P");
        addressB.setCountry("C");
        addressB.setType(com.shopsphere.address.entity.AddressType.HOME);

        Address savedAddressB =
                addressRepository.save(addressB);

        assertThrows(
                com.shopsphere.exception.AddressNotFoundException.class,
                () -> orderService.placeOrder(
                        savedAddressB.getId(),
                        user
                )
        );
    }

    @Test
    void testTransactionalRollbackMultiProduct() {

        Product p2 = new Product();
        p2.setName("P2");
        p2.setPrice(new BigDecimal("10.00"));
        p2.setStockQuantity(10);
        p2.setStatus(ProductStatus.ACTIVE);
        p2.setCategory(product.getCategory());
        p2 = productRepository.save(p2);

        Product p3 = new Product();
        p3.setName("P3");
        p3.setPrice(new BigDecimal("10.00"));
        p3.setStockQuantity(0);
        p3.setStatus(ProductStatus.ACTIVE);
        p3.setCategory(product.getCategory());
        p3 = productRepository.save(p3);

        Cart cart =
                cartRepository.findByUser(user).orElseThrow();

        CartItem item2 = new CartItem();
        item2.setCart(cart);
        item2.setProduct(p2);
        item2.setQuantity(1);

        CartItem item3 = new CartItem();
        item3.setCart(cart);
        item3.setProduct(p3);
        item3.setQuantity(1);

        cartItemRepository.save(item2);
        cartItemRepository.save(item3);

        assertThrows(
                InsufficientStockException.class,
                () -> orderService.placeOrder(
                        address.getId(),
                        user
                )
        );

        assertEquals(
                10,
                productRepository.findById(product.getId())
                        .orElseThrow()
                        .getStockQuantity()
        );

        assertEquals(
                10,
                productRepository.findById(p2.getId())
                        .orElseThrow()
                        .getStockQuantity()
        );

        assertEquals(
                0,
                productRepository.findById(p3.getId())
                        .orElseThrow()
                        .getStockQuantity()
        );

        assertEquals(0, orderRepository.count());
    }
}
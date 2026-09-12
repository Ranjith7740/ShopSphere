package com.shopsphere.product.service;

import com.shopsphere.category.entity.Category;
import com.shopsphere.category.entity.CategoryStatus;
import com.shopsphere.category.repository.CategoryRepository;
import com.shopsphere.exception.CategoryNotFoundException;
import com.shopsphere.exception.InactiveCategoryException;
import com.shopsphere.exception.InvalidPaginationException;
import com.shopsphere.exception.InvalidSortException;
import com.shopsphere.exception.ProductNotFoundException;
import com.shopsphere.product.dto.CreateProductRequest;
import com.shopsphere.product.dto.ProductPageResponse;
import com.shopsphere.product.dto.ProductResponse;
import com.shopsphere.product.dto.UpdateProductRequest;
import com.shopsphere.product.entity.Product;
import com.shopsphere.product.entity.ProductStatus;
import com.shopsphere.product.repository.ProductRepository;
import com.shopsphere.product.specification.ProductSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ProductService {

    // Whitelisted so a client can never sort by an arbitrary/internal column
    // (or trigger an error probing for column names) via the "sort" query param.
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("price", "name", "createdAt");

    // A public listing endpoint with no upper bound lets a client request the
    // entire catalog in one call; 100 comfortably covers any real product-grid
    // page size while keeping a single response small.
    private static final int MAX_PAGE_SIZE = 100;

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    @Transactional
    public ProductResponse createProduct(CreateProductRequest request) {
        Category category = resolveActiveCategory(request.categoryId());

        Product product = new Product();
        product.setCategory(category);
        product.setName(request.name());
        product.setDescription(request.description());
        product.setPrice(request.price());
        product.setStockQuantity(request.stockQuantity());
        product.setStatus(ProductStatus.ACTIVE);

        return ProductResponse.fromEntity(productRepository.save(product));
    }

    @Transactional
    public ProductResponse updateProduct(Long productId, UpdateProductRequest request) {
        Product product = findById(productId);
        Category category = resolveActiveCategory(request.categoryId());

        product.setCategory(category);
        product.setName(request.name());
        product.setDescription(request.description());
        product.setPrice(request.price());
        product.setStockQuantity(request.stockQuantity());

        return ProductResponse.fromEntity(productRepository.save(product));
    }

    @Transactional
    public void deactivateProduct(Long productId) {
        Product product = findById(productId);
        product.setStatus(ProductStatus.INACTIVE);
        productRepository.save(product);
    }

    @Transactional
    public ProductResponse getActiveProductById(Long productId) {
        Product product = findById(productId);
        if (product.getStatus() != ProductStatus.ACTIVE) {
            throw new ProductNotFoundException(productId);
        }
        return ProductResponse.fromEntity(product);
    }

    @Transactional
    public ProductPageResponse searchActiveProducts(String search,
                                                       Long categoryId,
                                                       BigDecimal minPrice,
                                                       BigDecimal maxPrice,
                                                       String sort,
                                                       int page,
                                                       int size) {
        validatePagination(page, size);
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Specification<Product> specification =
                ProductSpecifications.search(search, categoryId, minPrice, maxPrice, ProductStatus.ACTIVE);

        Page<ProductResponse> responsePage = productRepository.findAll(specification, pageable)
                .map(ProductResponse::fromEntity);

        return ProductPageResponse.fromPage(responsePage);
    }

    private void validatePagination(int page, int size) {
        if (page < 0) {
            throw new InvalidPaginationException("Page must not be negative");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new InvalidPaginationException("Size must be between 1 and " + MAX_PAGE_SIZE);
        }
    }

    private Sort parseSort(String sort) {
        String[] parts = sort.split(",");
        if (parts.length != 2) {
            throw new InvalidSortException("Sort must be in the form 'field,direction', e.g. price,asc");
        }

        String field = parts[0].trim();
        if (!ALLOWED_SORT_FIELDS.contains(field)) {
            throw new InvalidSortException("Unsupported sort field '" + field + "'. Allowed fields: " + ALLOWED_SORT_FIELDS);
        }

        try {
            Sort.Direction direction = Sort.Direction.fromString(parts[1].trim());
            return Sort.by(direction, field);
        } catch (IllegalArgumentException ex) {
            throw new InvalidSortException("Unsupported sort direction '" + parts[1].trim() + "'. Use 'asc' or 'desc'");
        }
    }

    private Product findById(Long productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));
    }

    // A product must belong to a category that is currently visible to customers.
    // Allowing products under an INACTIVE category would create an ACTIVE product
    // that is unreachable through the public category listing - a confusing,
    // effectively-orphaned state. Same rule applies on update (including re-assignment).
    private Category resolveActiveCategory(Long categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new CategoryNotFoundException(categoryId));
        if (category.getStatus() != CategoryStatus.ACTIVE) {
            throw new InactiveCategoryException(categoryId);
        }
        return category;
    }
}

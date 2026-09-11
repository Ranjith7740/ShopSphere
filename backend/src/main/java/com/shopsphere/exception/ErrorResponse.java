package com.shopsphere.exception;

import java.time.LocalDateTime;
import java.util.Map;

public record ErrorResponse(
        LocalDateTime timestamp,
        int status,
        String message,
        String path,
        Map<String, String> fieldErrors
) {
    public ErrorResponse(int status, String message, String path) {
        this(LocalDateTime.now(), status, message, path, null);
    }

    public ErrorResponse(int status, String message, String path, Map<String, String> fieldErrors) {
        this(LocalDateTime.now(), status, message, path, fieldErrors);
    }
}

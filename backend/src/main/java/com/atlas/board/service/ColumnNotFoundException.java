package com.atlas.board.service;

public class ColumnNotFoundException extends RuntimeException {

    public ColumnNotFoundException(String message) {
        super(message);
    }
}

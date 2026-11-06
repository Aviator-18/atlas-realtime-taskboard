package com.atlas.board.service;

public class BoardNotFoundException extends RuntimeException {

    public BoardNotFoundException(String message) {
        super(message);
    }
}

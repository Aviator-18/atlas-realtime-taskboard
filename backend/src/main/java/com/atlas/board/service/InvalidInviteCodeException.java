package com.atlas.board.service;

public class InvalidInviteCodeException extends RuntimeException {

    public InvalidInviteCodeException(String message) {
        super(message);
    }
}

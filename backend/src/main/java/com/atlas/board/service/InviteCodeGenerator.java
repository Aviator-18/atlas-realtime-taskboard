package com.atlas.board.service;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

@Component
public class InviteCodeGenerator {

    private static final String ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    private static final int CODE_LENGTH = 8;
    private final SecureRandom random = new SecureRandom();

    public String generate() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            int index = random.nextInt(ALPHABET.length());
            sb.append(ALPHABET.charAt(index));
        }
        return sb.toString();
    }
}

package com.taskflow.service;

import com.taskflow.dto.AuthDtos.AuthResponse;
import com.taskflow.dto.AuthDtos.LoginRequest;
import com.taskflow.dto.AuthDtos.RegisterRequest;
import com.taskflow.dto.AuthDtos.UserResponse;
import com.taskflow.entity.Role;
import com.taskflow.entity.User;
import com.taskflow.exception.BadRequestException;
import com.taskflow.repository.UserRepository;
import com.taskflow.security.SecurityUtil;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.lang.reflect.Method;

@Service
public class AuthService {

    private static final List<String> AVATAR_PALETTE =
            List.of("#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Object jwtUtil;
    private final SecurityUtil securityUtil;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       Object jwtUtil, SecurityUtil securityUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.securityUtil = securityUtil;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("An account with this email already exists");
        }

        // Deterministic avatar color derived from the name via hashCode -> simple DSA taste
        int index = Math.floorMod(request.name().hashCode(), AVATAR_PALETTE.size());

        User user = new User(request.name().trim(), email,
                passwordEncoder.encode(request.password()), Role.MEMBER);
        user.setAvatarColor(AVATAR_PALETTE.get(index));

        user = userRepository.save(user);
        return new AuthResponse(generateToken(user),
                UserResponse.from(user));
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        return new AuthResponse(generateToken(user),
                UserResponse.from(user));
    }

    public UserResponse me() {
        return UserResponse.from(securityUtil.getCurrentUser());
    }

    private String generateToken(User user) {
        try {
            Method method = jwtUtil.getClass().getMethod("generateToken", String.class, Long.class, String.class);
            return (String) method.invoke(jwtUtil, user.getEmail(), user.getId(), user.getRole().name());
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Unable to generate JWT", e);
        }
    }
}
# Stage 1: Build the application artifact
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Copy Maven wrapper and configuration
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw

# Download dependencies offline for layer caching
RUN ./mvnw dependency:go-offline -B

# Copy source code and build jar
COPY src/ src/
RUN ./mvnw clean package -DskipTests -B

# Stage 2: Minimal runtime image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy JAR from build stage
COPY --from=builder /app/target/atlas-backend-0.1.0-SNAPSHOT.jar app.jar
RUN chown -R appuser:appgroup /app

USER appuser
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]

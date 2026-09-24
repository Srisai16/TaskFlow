# ---- build stage ----
FROM maven:3.9-eclipse-temurin-23 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline -B
COPY src ./src
RUN mvn -q clean package -DskipTests -B

# ---- run stage ----
FROM eclipse-temurin:23-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70"
ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar app.jar"]
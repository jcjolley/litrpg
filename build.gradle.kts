import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    kotlin("jvm") version "2.3.0"
    kotlin("plugin.allopen") version "2.3.0"
    id("io.quarkus")
}

repositories {
    mavenCentral()
    mavenLocal()
}

val quarkusPlatformGroupId: String by project
val quarkusPlatformArtifactId: String by project
val quarkusPlatformVersion: String by project

dependencies {
    // Quarkus BOM
    implementation(enforcedPlatform("${quarkusPlatformGroupId}:${quarkusPlatformArtifactId}:${quarkusPlatformVersion}"))
    implementation(enforcedPlatform("${quarkusPlatformGroupId}:quarkus-amazon-services-bom:${quarkusPlatformVersion}"))

    // Core Quarkus + Kotlin
    implementation("io.quarkus:quarkus-kotlin")
    implementation("io.quarkus:quarkus-arc")
    implementation("org.jetbrains.kotlin:kotlin-stdlib")

    // REST API
    implementation("io.quarkus:quarkus-rest")
    implementation("io.quarkus:quarkus-rest-jackson")

    // AWS Lambda HTTP - deploys REST API behind API Gateway
    implementation("io.quarkus:quarkus-amazon-lambda-http")

    // AWS DynamoDB
    implementation("io.quarkiverse.amazonservices:quarkus-amazon-dynamodb-enhanced")
    implementation("software.amazon.awssdk:url-connection-client")

    // Testing
    testImplementation("io.quarkus:quarkus-junit5")
    testImplementation("io.rest-assured:rest-assured")
}

group = "org.jcjolley"
version = "1.0.0-SNAPSHOT"

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

tasks.withType<Test> {
    systemProperty("java.util.logging.manager", "org.jboss.logmanager.LogManager")
    // Docker 29+ requires API version 1.44 for Testcontainers
    systemProperty("api.version", "1.44")
}

// Configure quarkusDev for Docker 29+ compatibility with DevServices (LocalStack)
tasks.named<io.quarkus.gradle.tasks.QuarkusDev>("quarkusDev") {
    jvmArgs = listOf("-Dapi.version=1.44")
}

// Note: Native builds require Docker to be properly configured
// On Windows, ensure C:\Program Files\Docker\Docker\resources\bin is before
// any docker.bat shims in your PATH environment variable
allOpen {
    annotation("jakarta.ws.rs.Path")
    annotation("jakarta.enterprise.context.ApplicationScoped")
    annotation("jakarta.persistence.Entity")
    annotation("io.quarkus.test.junit.QuarkusTest")
}

kotlin {
    compilerOptions {
        apiVersion.set(org.jetbrains.kotlin.gradle.dsl.KotlinVersion.KOTLIN_2_1)
        jvmTarget.set(JvmTarget.JVM_21)
        javaParameters.set(true)
    }
}

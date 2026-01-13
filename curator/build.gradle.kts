import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    kotlin("jvm")
    kotlin("plugin.serialization") version "2.3.0"
    application
}

application {
    mainClass.set("org.jcjolley.curator.MainKt")
}

repositories {
    mavenCentral()
}

val testcontainersVersion = "1.20.4"

dependencies {
    // CLI framework
    implementation("com.github.ajalt.clikt:clikt:5.0.3")

    // HTTP client for Ollama (Ktor 3.x)
    implementation("io.ktor:ktor-client-core:3.3.3")
    implementation("io.ktor:ktor-client-cio:3.3.3")
    implementation("io.ktor:ktor-client-content-negotiation:3.3.3")
    implementation("io.ktor:ktor-serialization-kotlinx-json:3.3.3")

    // JSON serialization
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.9.0")

    // HTML scraping
    implementation("it.skrape:skrapeit:1.3.0-alpha.2")

    // AWS DynamoDB
    implementation(platform("software.amazon.awssdk:bom:2.41.5"))
    implementation("software.amazon.awssdk:dynamodb-enhanced")
    implementation("software.amazon.awssdk:dynamodb")

    // Logging
    implementation("ch.qos.logback:logback-classic:1.5.16")
    implementation("io.github.microutils:kotlin-logging-jvm:3.0.5")

    // Testing
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.4")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
    testImplementation("org.testcontainers:testcontainers:$testcontainersVersion")
    testImplementation("org.testcontainers:junit-jupiter:$testcontainersVersion")
    testImplementation("io.mockk:mockk:1.13.16")
    testImplementation("org.wiremock:wiremock:3.12.1")
    testImplementation("io.strikt:strikt-core:0.35.1")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.1")
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_21)
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}

tasks.named<JavaExec>("run") {
    standardInput = System.`in`
}

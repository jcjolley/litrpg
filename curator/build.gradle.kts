import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    kotlin("jvm")
    kotlin("plugin.serialization") version "2.0.20"
    application
}

application {
    mainClass.set("org.jcjolley.curator.MainKt")
}

repositories {
    mavenCentral()
}

val testcontainersVersion = "1.19.8"

dependencies {
    // CLI framework
    implementation("com.github.ajalt.clikt:clikt:4.4.0")

    // HTTP client for Ollama
    implementation("io.ktor:ktor-client-core:2.3.12")
    implementation("io.ktor:ktor-client-cio:2.3.12")
    implementation("io.ktor:ktor-client-content-negotiation:2.3.12")
    implementation("io.ktor:ktor-serialization-kotlinx-json:2.3.12")

    // JSON serialization
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")

    // HTML scraping (shared with main project)
    implementation("it.skrape:skrapeit:1.3.0-alpha.2")

    // AWS DynamoDB
    implementation(platform("software.amazon.awssdk:bom:2.25.60"))
    implementation("software.amazon.awssdk:dynamodb-enhanced")
    implementation("software.amazon.awssdk:dynamodb")

    // Logging
    implementation("ch.qos.logback:logback-classic:1.4.14")
    implementation("io.github.microutils:kotlin-logging-jvm:3.0.5")

    // Testing
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
    testImplementation("org.testcontainers:testcontainers:$testcontainersVersion")
    testImplementation("org.testcontainers:junit-jupiter:$testcontainersVersion")
    testImplementation("io.mockk:mockk:1.13.10")
    testImplementation("org.wiremock:wiremock:3.5.4")
    testImplementation("io.strikt:strikt-core:0.34.1")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
}

java {
    sourceCompatibility = JavaVersion.VERSION_19
    targetCompatibility = JavaVersion.VERSION_19
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_19)
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}

tasks.named<JavaExec>("run") {
    standardInput = System.`in`
}

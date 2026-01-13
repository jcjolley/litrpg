pluginManagement {
    val quarkusPluginVersion: String by settings
    val quarkusPluginId: String by settings
    repositories {
        mavenCentral()
        gradlePluginPortal()
        mavenLocal()
    }
    plugins {
        id(quarkusPluginId) version quarkusPluginVersion
        id("org.jetbrains.gradle.plugin.idea-ext") version "1.1.8"
    }
}
rootProject.name="code-with-quarkus"

include("curator")

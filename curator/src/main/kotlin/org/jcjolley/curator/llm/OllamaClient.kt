package org.jcjolley.curator.llm

import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import mu.KotlinLogging

private val logger = KotlinLogging.logger {}

@Serializable
data class OllamaRequest(
    val model: String,
    val prompt: String,
    val stream: Boolean = false
)

@Serializable
data class OllamaResponse(
    val response: String,
    val done: Boolean
)

class OllamaClient(
    private val baseUrl: String = "http://localhost:11434",
    private val model: String = "llama3.2:latest"
) {
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    private val client = HttpClient(CIO) {
        engine {
            requestTimeout = 120_000  // 2 minutes for LLM generation
        }
    }

    suspend fun generate(prompt: String): String {
        logger.debug { "Sending prompt to Ollama (${prompt.length} chars)" }

        val requestBody = json.encodeToString(OllamaRequest(model = model, prompt = prompt))

        val response = client.post("$baseUrl/api/generate") {
            contentType(ContentType.Application.Json)
            setBody(requestBody)
        }

        // Ollama returns ndjson (newline-delimited JSON) - parse each line and combine responses
        val responseText = response.bodyAsText()
        val fullResponse = responseText
            .lineSequence()
            .filter { it.isNotBlank() }
            .map { json.decodeFromString<OllamaResponse>(it) }
            .map { it.response }
            .joinToString("")

        logger.debug { "Received response (${fullResponse.length} chars)" }
        return fullResponse.trim()
    }

    fun close() {
        client.close()
    }
}

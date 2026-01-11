package org.jcjolley.curator.llm

import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.Serializable
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
    private val client = HttpClient(CIO) {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                isLenient = true
            })
        }
        engine {
            requestTimeout = 120_000  // 2 minutes for LLM generation
        }
    }

    suspend fun generate(prompt: String): String {
        logger.debug { "Sending prompt to Ollama (${prompt.length} chars)" }

        val response = client.post("$baseUrl/api/generate") {
            contentType(ContentType.Application.Json)
            setBody(OllamaRequest(model = model, prompt = prompt))
        }

        val ollamaResponse = response.body<OllamaResponse>()
        logger.debug { "Received response (${ollamaResponse.response.length} chars)" }

        return ollamaResponse.response.trim()
    }

    fun close() {
        client.close()
    }
}

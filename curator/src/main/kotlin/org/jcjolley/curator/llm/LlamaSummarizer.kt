package org.jcjolley.curator.llm

import kotlinx.serialization.json.Json
import mu.KotlinLogging
import org.jcjolley.curator.model.BookFacts

private val logger = KotlinLogging.logger {}

/**
 * Two-pass LLM summarization for book descriptions.
 *
 * Pass 1: Extract structured facts from Audible's description
 * Pass 2: Generate an engaging 2-sentence blurb from the facts
 */
class LlamaSummarizer(
    private val ollamaClient: OllamaClient
) {
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    /**
     * Pass 1: Extract structured facts from the raw description
     */
    suspend fun extractFacts(description: String): BookFacts {
        val prompt = """
            |Extract the key story facts from this book description. Output valid JSON only.
            |
            |DESCRIPTION:
            |$description
            |
            |Output this exact JSON structure (fill in values, use null if not found):
            |{
            |  "protagonist": "name of main character",
            |  "setting": "world or location description",
            |  "problem": "the conflict or challenge they face",
            |  "inciting_incident": "what forces them to act",
            |  "goal": "what they are trying to achieve",
            |  "tone": "dark humor / epic / gritty / lighthearted",
            |  "genre": "Cultivation / System Apocalypse / Dungeon Crawl / GameLit / Isekai / Tower Climb / Progression Fantasy"
            |}
            |
            |JSON:
        """.trimMargin()

        val response = ollamaClient.generate(prompt)
        logger.debug { "Pass 1 response: $response" }

        return parseFacts(response)
    }

    /**
     * Pass 2: Generate a 2-sentence blurb from extracted facts
     */
    suspend fun generateBlurb(facts: BookFacts): String {
        val prompt = """
            |Write a 2-sentence book blurb using these facts.
            |
            |FACTS:
            |- Protagonist: ${facts.protagonist ?: "Unknown"}
            |- Setting: ${facts.setting ?: "Unknown"}
            |- Problem: ${facts.problem ?: "Unknown"}
            |- Inciting incident: ${facts.incitingIncident ?: "Unknown"}
            |- Goal: ${facts.goal ?: "Unknown"}
            |- Tone: ${facts.tone ?: "epic"}
            |- Genre: ${facts.genre ?: "Progression Fantasy"}
            |
            |STRICT RULES:
            |1. EXACTLY 2 sentences, then the genre tag
            |2. Total under 50 words (count them!)
            |3. First sentence = hook with protagonist
            |4. Second sentence = stakes/goal
            |5. End with: "${facts.genre ?: "Progression Fantasy"}."
            |6. NO questions. Statements only.
            |7. NO "Will he survive?" or "Can she...?" style endings
            |
            |Blurb:
        """.trimMargin()

        val response = ollamaClient.generate(prompt)
        logger.debug { "Pass 2 response: $response" }

        return cleanBlurb(response, facts.genre ?: "Progression Fantasy")
    }

    /**
     * Full two-pass summarization pipeline
     */
    suspend fun summarize(description: String): SummarizationResult {
        logger.info { "Starting two-pass summarization..." }

        // Pass 1: Extract facts
        logger.info { "Pass 1: Extracting facts..." }
        val facts = extractFacts(description)
        logger.info { "Extracted: protagonist=${facts.protagonist}, genre=${facts.genre}" }

        // Pass 2: Generate blurb
        logger.info { "Pass 2: Generating blurb..." }
        val blurb = generateBlurb(facts)
        logger.info { "Generated blurb (${countWords(blurb)} words)" }

        return SummarizationResult(
            facts = facts,
            blurb = blurb,
            wordCount = countWords(blurb)
        )
    }

    private fun parseFacts(response: String): BookFacts {
        // Try to extract JSON from the response (model may include extra text)
        val jsonStart = response.indexOf('{')
        val jsonEnd = response.lastIndexOf('}')

        if (jsonStart == -1 || jsonEnd == -1) {
            logger.warn { "Could not find JSON in response, returning empty facts" }
            return BookFacts(null, null, null, null, null, null, null)
        }

        val jsonStr = response.substring(jsonStart, jsonEnd + 1)
            // Handle snake_case to camelCase
            .replace("\"inciting_incident\"", "\"incitingIncident\"")

        return try {
            json.decodeFromString<BookFacts>(jsonStr)
        } catch (e: Exception) {
            logger.warn(e) { "Failed to parse facts JSON: $jsonStr" }
            BookFacts(null, null, null, null, null, null, null)
        }
    }

    private fun cleanBlurb(response: String, genre: String): String {
        var blurb = response.trim()

        // Remove any "Blurb:" prefix if model repeated it
        if (blurb.startsWith("Blurb:", ignoreCase = true)) {
            blurb = blurb.substringAfter(":").trim()
        }

        // Ensure it ends with genre tag
        if (!blurb.endsWith(genre, ignoreCase = true) &&
            !blurb.endsWith("$genre.", ignoreCase = true)) {
            blurb = "$blurb $genre."
        }

        return blurb
    }

    private fun countWords(text: String): Int {
        return text.split("\\s+".toRegex()).filter { it.isNotBlank() }.size
    }
}

data class SummarizationResult(
    val facts: BookFacts,
    val blurb: String,
    val wordCount: Int
) {
    fun isValid(): Boolean {
        return wordCount in 30..70 &&
            !blurb.contains("?") &&
            facts.protagonist != null
    }

    fun validationIssues(): List<String> {
        val issues = mutableListOf<String>()
        if (wordCount < 30) issues.add("Too short ($wordCount words, minimum 30)")
        if (wordCount > 70) issues.add("Too long ($wordCount words, maximum 70)")
        if (blurb.contains("?")) issues.add("Contains a question")
        if (facts.protagonist == null) issues.add("No protagonist extracted")
        return issues
    }
}

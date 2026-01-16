package org.jcjolley.curator.llm

import kotlinx.serialization.json.Json
import mu.KotlinLogging
import org.jcjolley.curator.model.BookFacts

private val logger = KotlinLogging.logger {}

/**
 * Valid genres for LitRPG books - LLM must pick 1-5 from this list
 */
val VALID_GENRES = setOf(
    // Core Subgenres (what IS the book?)
    "LitRPG",              // Explicit stats, levels, game UI
    "GameLit",             // Game elements, soft stats, less crunchy
    "Progression Fantasy", // Power growth, no game UI
    "Cultivation",         // Eastern martial arts power system
    "Xianxia",             // Chinese immortal cultivation
    "Wuxia",               // Martial arts, minimal supernatural

    // Setting Types
    "System Apocalypse",   // Game system appears in real world
    "Dungeon Core",        // MC is/controls the dungeon
    "Tower Climb",         // Ascending floors of increasing difficulty
    "Dungeon Diving",      // Exploring dungeons as adventurer
    "Post-Apocalyptic",    // After civilization collapse
    "Virtual Reality",     // VR/VRMMO game setting

    // Narrative Structures
    "Isekai",              // Transported to another world
    "Portal Fantasy",      // Gateway to fantasy world (Western isekai)
    "Reincarnation",       // Reborn in new body/world
    "Regression",          // Second chance with future knowledge
    "Time Loop",           // Repeating time period

    // Gameplay/Mechanics Focus
    "Monster Evolution",   // MC evolves as non-human
    "Base Building",       // Constructing settlements/bases
    "Kingdom Building",    // Managing territories/nations
    "Crafting",            // Item creation focus
    "Deck Building",       // Card-based magic/combat system
    "Summoner",            // Controlling minions/creatures

    // Tone/Style
    "Dark Fantasy",        // Gritty, morally gray, high stakes
    "Slice of Life",       // Low-stakes daily life focus
    "Comedy",              // Humor-focused narrative
    "Harem",               // Multiple romantic interests

    // Setting/Theme
    "Academy",             // School/training institution setting
    "Military",            // Organized warfare focus
    "Solo Leveling",       // Lone wolf power fantasy (weak-to-strong)
    "Party-Based",         // Team/group adventure focus
)

/**
 * Two-pass LLM summarization for book descriptions.
 *
 * Pass 1: Extract structured facts from Audible's description
 * Pass 2: Generate an engaging 2-sentence blurb from the facts
 */
class LlamaSummarizer(
    private val ollamaClient: OllamaClient,
    private val maxRetries: Int = 3
) {
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    /**
     * Pass 1: Extract structured facts from the raw description
     * Retries up to maxRetries if genres are invalid
     */
    suspend fun extractFacts(description: String): BookFacts {
        val genreList = VALID_GENRES.joinToString(", ")

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
            |  "genres": ["genre1", "genre2", ...]
            |}
            |
            |IMPORTANT: For genres, you MUST:
            |1. Pick 1-5 genres from this list ONLY: $genreList
            |2. Order them by relevance (most defining genre first)
            |3. Use "GameLit" only when more specific genres don't fit
            |4. Include narrative structure (Isekai, Time Loop, etc.) when applicable
            |5. Include mechanics focus (Base Building, Crafting, etc.) when central to the story
            |
            |JSON:
        """.trimMargin()

        repeat(maxRetries) { attempt ->
            val response = ollamaClient.generate(prompt)
            logger.debug { "Pass 1 response (attempt ${attempt + 1}): $response" }

            val facts = parseFacts(response)
            val validation = validateGenres(facts)

            if (validation.isValid) {
                return facts
            }

            logger.warn { "Attempt ${attempt + 1}/$maxRetries failed validation: ${validation.issues.joinToString()}" }

            if (attempt < maxRetries - 1) {
                logger.info { "Retrying extraction..." }
            }
        }

        // Final attempt failed - throw exception
        val lastFacts = parseFacts(ollamaClient.generate(prompt))
        val validation = validateGenres(lastFacts)
        throw InvalidGenreException(
            "Failed to extract valid genres after $maxRetries attempts. " +
            "Issues: ${validation.issues.joinToString()}. " +
            "Got genres=${lastFacts.genres}"
        )
    }

    /**
     * Pass 2: Generate a 2-sentence blurb from extracted facts
     */
    suspend fun generateBlurb(facts: BookFacts): String {
        val primaryGenre = facts.genres.firstOrNull() ?: "Progression Fantasy"
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
            |- Genres: ${facts.genres.joinToString(", ").ifEmpty { "Progression Fantasy" }}
            |
            |STRICT RULES:
            |1. EXACTLY 2 sentences, then the genre tag
            |2. Total under 50 words (count them!)
            |3. First sentence = hook with protagonist
            |4. Second sentence = stakes/goal
            |5. End with: "$primaryGenre."
            |6. NO questions. Statements only.
            |7. NO "Will he survive?" or "Can she...?" style endings
            |
            |Blurb:
        """.trimMargin()

        val response = ollamaClient.generate(prompt)
        logger.debug { "Pass 2 response: $response" }

        return cleanBlurb(response, primaryGenre)
    }

    /**
     * Full two-pass summarization pipeline
     */
    suspend fun summarize(description: String): SummarizationResult {
        logger.info { "Starting two-pass summarization..." }

        // Pass 1: Extract facts (with validation and retry)
        logger.info { "Pass 1: Extracting facts..." }
        val facts = extractFacts(description)
        logger.info { "Extracted: protagonist=${facts.protagonist}, genres=${facts.genres}" }

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
            return BookFacts(null, null, null, null, null, null, emptyList())
        }

        val jsonStr = response.substring(jsonStart, jsonEnd + 1)
            // Handle snake_case to camelCase
            .replace("\"inciting_incident\"", "\"incitingIncident\"")

        return try {
            json.decodeFromString<BookFacts>(jsonStr)
        } catch (e: Exception) {
            logger.warn(e) { "Failed to parse facts JSON: $jsonStr" }
            BookFacts(null, null, null, null, null, null, emptyList())
        }
    }

    private fun validateGenres(facts: BookFacts): GenreValidationResult {
        val issues = mutableListOf<String>()

        if (facts.genres.isEmpty()) {
            issues.add("Genres list is empty - must have 1-5 genres")
        } else if (facts.genres.size > 5) {
            issues.add("Too many genres (${facts.genres.size}) - maximum is 5")
        } else {
            val invalidGenres = facts.genres.filter { it !in VALID_GENRES }
            if (invalidGenres.isNotEmpty()) {
                issues.add("Invalid genres: ${invalidGenres.joinToString()} - must be from: ${VALID_GENRES.joinToString()}")
            }
        }

        return GenreValidationResult(issues.isEmpty(), issues)
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

data class GenreValidationResult(
    val isValid: Boolean,
    val issues: List<String>
)

class InvalidGenreException(message: String) : Exception(message)

data class SummarizationResult(
    val facts: BookFacts,
    val blurb: String,
    val wordCount: Int
) {
    fun isValid(): Boolean {
        return wordCount in 30..70 &&
            !blurb.contains("?") &&
            facts.protagonist != null &&
            facts.genres.isNotEmpty() &&
            facts.genres.size <= 5 &&
            facts.genres.all { it in VALID_GENRES }
    }

    fun validationIssues(): List<String> {
        val issues = mutableListOf<String>()
        if (wordCount < 30) issues.add("Too short ($wordCount words, minimum 30)")
        if (wordCount > 70) issues.add("Too long ($wordCount words, maximum 70)")
        if (blurb.contains("?")) issues.add("Contains a question")
        if (facts.protagonist == null) issues.add("No protagonist extracted")
        if (facts.genres.isEmpty()) {
            issues.add("No genres extracted")
        } else if (facts.genres.size > 5) {
            issues.add("Too many genres (${facts.genres.size}, max 5)")
        } else {
            val invalidGenres = facts.genres.filter { it !in VALID_GENRES }
            if (invalidGenres.isNotEmpty()) {
                issues.add("Invalid genres: ${invalidGenres.joinToString()}")
            }
        }
        return issues
    }
}

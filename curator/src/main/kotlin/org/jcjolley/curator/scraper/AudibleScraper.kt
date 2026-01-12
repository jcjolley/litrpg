package org.jcjolley.curator.scraper

import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import it.skrape.core.htmlDocument
import it.skrape.selects.CssSelectable
import it.skrape.selects.DocElement
import it.skrape.selects.ElementNotFoundException
import kotlinx.serialization.json.*
import mu.KotlinLogging
import org.jcjolley.curator.model.ScrapedBook

private val logger = KotlinLogging.logger {}

class AudibleScraper {
    private val client = HttpClient(CIO) {
        engine {
            requestTimeout = 30_000
        }
    }

    private val json = Json { ignoreUnknownKeys = true }

    /**
     * Scrape a single book's product page from Audible
     *
     * @param url Audible product URL (e.g., https://www.audible.com/pd/Book-Title-Audiobook/B0...)
     * @return Scraped book data
     */
    suspend fun scrapeBook(url: String): ScrapedBook {
        logger.info { "Scraping Audible page: $url" }

        val html = client.get(url) {
            headers {
                // Use a standard browser user agent
                append("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                append("Accept", "text/html")
                append("Accept-Language", "en-US,en;q=0.9")
            }
        }.bodyAsText()

        return parseProductPage(html, url)
    }

    /**
     * Parse the HTML of an Audible product page.
     * Audible now uses JSON data embedded in the page for metadata.
     */
    fun parseProductPage(html: String, sourceUrl: String): ScrapedBook {
        val asin = extractAsin(sourceUrl)

        // Extract metadata JSON from the page (contains authors, narrators, rating)
        val metadataJson = extractMetadataJson(html)

        // Extract author from JSON
        val author = metadataJson?.get("authors")?.jsonArray
            ?.firstOrNull()?.jsonObject?.get("name")?.jsonPrimitive?.contentOrNull
            ?: "Unknown"

        // Extract rating from JSON
        val rating = metadataJson?.get("rating")?.jsonObject?.get("value")?.jsonPrimitive?.doubleOrNull ?: 0.0
        val numRatings = metadataJson?.get("rating")?.jsonObject?.get("count")?.jsonPrimitive?.intOrNull ?: 0

        // Extract duration - look for "duration":"X hrs and Y mins" pattern
        val duration = Regex(""""duration"\s*:\s*"([^"]+)"""").find(html)?.groupValues?.get(1) ?: "Unknown"

        // Extract release date - format: "releaseDate":"MM-DD-YY"
        val releaseDate = Regex(""""releaseDate"\s*:\s*"([^"]+)"""").find(html)?.groupValues?.get(1) ?: "Unknown"

        // Extract series info from JSON pattern
        val seriesMatch = Regex(""""series"\s*:\s*\[\s*\{[^}]*"part"\s*:\s*"([^"]*)"[^}]*"name"\s*:\s*"([^"]*)"""").find(html)
        val seriesPart = seriesMatch?.groupValues?.get(1)
        val seriesName = seriesMatch?.groupValues?.get(2)
        val (series, seriesPosition) = if (seriesName != null) {
            Pair(seriesName, parseBookNumber(seriesPart))
        } else {
            Pair(null, null)
        }

        // Extract description - look for the JSON description field with HTML content
        val description = Regex(""""description"\s*:\s*"((?:[^"\\]|\\.)*)"""")
            .findAll(html)
            .map { it.groupValues[1] }
            .filter { it.contains("<p>") || it.length > 100 }  // Find the HTML description, not the meta one
            .firstOrNull()
            ?.let { unescapeJson(it) }
            ?.let { stripHtml(it) }
            ?: ""

        // Extract cover image - look for the product image
        val imageUrl = Regex("""https://m\.media-amazon\.com/images/I/[^"]+\.jpg""")
            .findAll(html)
            .map { it.value }
            .filter { !it.contains("SocialShare") && !it.contains("placeholder") }
            .firstOrNull()
            ?: ""

        return htmlDocument(html) {
            // Title - usually in h1
            val title = findFirstOrNull("h1.bc-heading") { text }
                ?: findFirst("h1") { text }

            // Subtitle - may not exist
            val subtitle = findFirstOrNull("span.bc-text.bc-size-medium.bc-color-secondary") { text }

            ScrapedBook(
                title = title.trim(),
                subtitle = subtitle?.trim(),
                author = author.trim(),
                authorUrl = null,
                series = series,
                seriesPosition = seriesPosition,
                length = duration,
                releaseDate = releaseDate,
                language = "English",
                imageUrl = imageUrl,
                audibleUrl = sourceUrl,
                audibleAsin = asin,
                rating = rating,
                numRatings = numRatings,
                originalDescription = description.trim()
            )
        }
    }

    /**
     * Extract the metadata JSON object from adbl-product-metadata element
     */
    private fun extractMetadataJson(html: String): JsonObject? {
        // Pattern: {"rating":{...},"authors":[...],"narrators":[...]}
        val pattern = Regex("""\{"rating":\{[^}]+\},"authors":\[[^\]]+\],"narrators":\[[^\]]+\]\}""")
        val match = pattern.find(html) ?: return null
        return try {
            json.parseToJsonElement(match.value).jsonObject
        } catch (e: Exception) {
            logger.warn { "Failed to parse metadata JSON: ${e.message}" }
            null
        }
    }

    /**
     * Parse book number from series part text like "Book 4"
     */
    private fun parseBookNumber(partText: String?): Int? {
        if (partText == null) return null
        return Regex("""(\d+)""").find(partText)?.value?.toIntOrNull()
    }

    /**
     * Unescape JSON string (handle \/ and other escapes)
     */
    private fun unescapeJson(s: String): String {
        return s.replace("\\/", "/")
            .replace("\\n", "\n")
            .replace("\\\"", "\"")
            .replace("\\\\", "\\")
    }

    /**
     * Strip HTML tags from a string
     */
    private fun stripHtml(html: String): String {
        return html.replace(Regex("<[^>]+>"), " ")
            .replace(Regex("\\s+"), " ")
            .trim()
    }

    /**
     * Parse series info like "Book 1" or "Cradle, Book 1"
     */
    private fun parseSeriesInfo(seriesText: String?): Pair<String?, Int?> {
        if (seriesText == null) return Pair(null, null)

        val bookPattern = Regex("""(.+?),?\s*Book\s*(\d+)""", RegexOption.IGNORE_CASE)
        val match = bookPattern.find(seriesText)

        return if (match != null) {
            Pair(match.groupValues[1].trim(), match.groupValues[2].toIntOrNull())
        } else {
            Pair(seriesText.trim(), null)
        }
    }

    /**
     * Extract ASIN from Audible URL
     */
    private fun extractAsin(url: String): String {
        // URLs look like: https://www.audible.com/pd/Title-Audiobook/B0CK1QXYZ
        val asinPattern = Regex("""/([A-Z0-9]{10})(?:\?|$|/)""")
        return asinPattern.find(url)?.groupValues?.get(1) ?: ""
    }

    /**
     * Parse rating from text like "4.7 out of 5 stars"
     */
    private fun parseRating(text: String?): Double {
        if (text == null) return 0.0
        val pattern = Regex("""(\d+\.?\d*)\s*out of""")
        return pattern.find(text)?.groupValues?.get(1)?.toDoubleOrNull() ?: 0.0
    }

    /**
     * Parse number of ratings from text like "12,847 ratings"
     */
    private fun parseNumRatings(text: String?): Int {
        if (text == null) return 0
        val cleaned = text.replace(",", "").replace(" ", "")
        val pattern = Regex("""(\d+)""")
        return pattern.find(cleaned)?.value?.toIntOrNull() ?: 0
    }

    /**
     * Normalize relative URLs to absolute Audible URLs
     */
    private fun normalizeUrl(url: String): String {
        return if (url.startsWith("/")) {
            "https://www.audible.com$url"
        } else {
            url
        }
    }

    fun close() {
        client.close()
    }
}

// Extension function for safer element finding
fun <T : Any?> CssSelectable.findFirstOrNull(cssSelector: String, init: DocElement.() -> T): T? {
    return try {
        findFirst(cssSelector, init)
    } catch (e: ElementNotFoundException) {
        null
    }
}

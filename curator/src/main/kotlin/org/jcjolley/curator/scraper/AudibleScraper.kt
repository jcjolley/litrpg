package org.jcjolley.curator.scraper

import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import it.skrape.core.htmlDocument
import it.skrape.selects.CssSelectable
import it.skrape.selects.DocElement
import it.skrape.selects.ElementNotFoundException
import mu.KotlinLogging
import org.jcjolley.curator.model.ScrapedBook

private val logger = KotlinLogging.logger {}

class AudibleScraper {
    private val client = HttpClient(CIO) {
        engine {
            requestTimeout = 30_000
        }
    }

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
     * Parse the HTML of an Audible product page
     */
    fun parseProductPage(html: String, sourceUrl: String): ScrapedBook {
        return htmlDocument(html) {
            // Extract ASIN from URL
            val asin = extractAsin(sourceUrl)

            // Title - usually in h1 with specific class
            val title = findFirstOrNull("h1.bc-heading") { text }
                ?: findFirst("h1") { text }

            // Subtitle - may not exist
            val subtitle = findFirstOrNull("span.bc-text.bc-size-medium.bc-color-secondary") { text }

            // Author info
            val authorElement = findFirstOrNull("li.authorLabel a") { this }
            val author = authorElement?.text ?: findFirstOrNull("li.authorLabel span") { text } ?: "Unknown"
            val authorUrl = authorElement?.attribute("href")

            // Series info
            val seriesElement = findFirstOrNull("li.seriesLabel a") { this }
            val seriesText = seriesElement?.text
            val (series, seriesPosition) = parseSeriesInfo(seriesText)

            // Runtime/Length
            val length = findFirstOrNull("li.runtimeLabel span") { text }
                ?.replace("Length:", "")
                ?.trim()
                ?: "Unknown"

            // Release date
            val releaseDate = findFirstOrNull("li.releaseDateLabel span") { text }
                ?.replace("Release date:", "")
                ?.trim()
                ?: "Unknown"

            // Language
            val language = findFirstOrNull("li.languageLabel span") { text }
                ?.replace("Language:", "")
                ?.trim()
                ?: "English"

            // Cover image - try multiple selectors
            val imageUrl = findFirstOrNull("img.bc-pub-block.bc-image-inset-border") { attribute("src") }
                ?: findFirstOrNull("div.hero-content img") { attribute("src") }
                ?: findFirstOrNull("img[data-product-image]") { attribute("src") }
                ?: ""

            // Rating
            val ratingText = findFirstOrNull("li.ratingsLabel span.bc-pub-offscreen") { text }
            val rating = parseRating(ratingText)

            // Number of ratings
            val numRatingsText = findFirstOrNull("li.ratingsLabel span.bc-text") { text }
                ?: findFirstOrNull("span.bc-color-link") { text }
            val numRatings = parseNumRatings(numRatingsText)

            // Description - try the publisher summary section
            val description = findFirstOrNull("div.bc-expander-content span.bc-text") { text }
                ?: findFirstOrNull("div.bc-box.bc-box-padding-small span") { text }
                ?: findFirstOrNull("div.productPublisherSummary span") { text }
                ?: ""

            ScrapedBook(
                title = title.trim(),
                subtitle = subtitle?.trim(),
                author = author.trim(),
                authorUrl = authorUrl?.let { normalizeUrl(it) },
                series = series,
                seriesPosition = seriesPosition,
                length = length,
                releaseDate = releaseDate,
                language = language,
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

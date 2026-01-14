package org.jcjolley.curator.scraper

import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import it.skrape.core.htmlDocument
import it.skrape.selects.DocElement
import mu.KotlinLogging
import org.jcjolley.curator.model.ScrapedRoyalRoadBook

private val logger = KotlinLogging.logger {}

class RoyalRoadScraper {
    private val client = HttpClient(CIO) {
        engine {
            requestTimeout = 30_000
        }
    }

    /**
     * Scrape a fiction page from Royal Road
     *
     * @param url Royal Road fiction URL (e.g., https://www.royalroad.com/fiction/12345/title)
     * @return Scraped book data
     */
    suspend fun scrapeBook(url: String): ScrapedRoyalRoadBook {
        logger.info { "Scraping Royal Road page: $url" }

        val html = client.get(url) {
            headers {
                append("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                append("Accept", "text/html")
                append("Accept-Language", "en-US,en;q=0.9")
            }
        }.bodyAsText()

        return parseProductPage(html, url)
    }

    /**
     * Parse the HTML of a Royal Road fiction page
     */
    fun parseProductPage(html: String, sourceUrl: String): ScrapedRoyalRoadBook {
        val fictionId = extractFictionId(sourceUrl)

        return htmlDocument(html) {
            // Title - in h1 with class "font-white"
            val title = findFirstOrNull("h1.font-white") { text }
                ?: findFirstOrNull("h1") { text }
                ?: "Unknown Title"

            // Author - in the author link
            val authorElement = findFirstOrNull("h4.font-white a[href*='/profile/']") { this }
            val author = authorElement?.text ?: "Unknown Author"
            val authorUrl = authorElement?.attribute("href")?.let { normalizeUrl(it) }

            // Description/synopsis - in the description div
            val description = findFirstOrNull("div.description div.hidden-content") { text }
                ?: findFirstOrNull("div.description") { text }
                ?: ""

            // Tags - from the tag elements
            val tags = findAll("span.tags a.fiction-tag") { map { it.text.trim() } }

            // Cover image
            val imageUrl = findFirstOrNull("div.fic-header img.thumbnail") { attribute("src") }
                ?: findFirstOrNull("img.fic-cover") { attribute("src") }
                ?: ""

            // Stats - extract from the stats row
            val stats = extractStats(html)

            // Rating - from the rating element
            val ratingText = findFirstOrNull("span.star[data-content]") { attribute("data-content") }
                ?: findFirstOrNull("span.star") { attribute("title") }
            val rating = parseRating(ratingText)

            // Number of ratings
            val numRatingsText = findFirstOrNull("span.ratings") { text }
            val numRatings = parseNumRatings(numRatingsText)

            ScrapedRoyalRoadBook(
                title = cleanTitle(title.trim()),
                author = author.trim(),
                authorUrl = authorUrl,
                tags = tags,
                pageCount = stats.pages,
                chapterCount = stats.chapters,
                followers = stats.followers,
                views = stats.views,
                imageUrl = normalizeUrl(imageUrl),
                royalRoadUrl = sourceUrl,
                royalRoadId = fictionId,
                rating = rating,
                numRatings = numRatings,
                originalDescription = description.trim()
            )
        }
    }

    /**
     * Extract fiction ID from Royal Road URL
     * URLs look like: https://www.royalroad.com/fiction/12345/title-slug
     */
    private fun extractFictionId(url: String): String {
        val pattern = Regex("""/fiction/(\d+)""")
        return pattern.find(url)?.groupValues?.get(1) ?: ""
    }

    /**
     * Clean the title by removing tags like [LitRPG] etc from display
     */
    private fun cleanTitle(title: String): String {
        // Keep the original title including tags - they're useful metadata
        return title.trim()
    }

    /**
     * Extract stats from the stats section
     */
    private data class Stats(
        val pages: Int = 0,
        val chapters: Int = 0,
        val followers: Int = 0,
        val views: Int = 0
    )

    private fun extractStats(html: String): Stats {
        var pages = 0
        var chapters = 0
        var followers = 0
        var views = 0

        // Pages - look for "X Pages" pattern
        Regex("""([\d,]+)\s*Pages""", RegexOption.IGNORE_CASE).find(html)?.let {
            pages = it.groupValues[1].replace(",", "").toIntOrNull() ?: 0
        }

        // Chapters - look for "X Chapters" pattern
        Regex("""([\d,]+)\s*Chapters?""", RegexOption.IGNORE_CASE).find(html)?.let {
            chapters = it.groupValues[1].replace(",", "").toIntOrNull() ?: 0
        }

        // Followers
        Regex("""([\d,]+)\s*Followers?""", RegexOption.IGNORE_CASE).find(html)?.let {
            followers = it.groupValues[1].replace(",", "").toIntOrNull() ?: 0
        }

        // Views
        Regex("""([\d,]+)\s*(?:Total\s+)?Views?""", RegexOption.IGNORE_CASE).find(html)?.let {
            views = it.groupValues[1].replace(",", "").toIntOrNull() ?: 0
        }

        return Stats(pages, chapters, followers, views)
    }

    /**
     * Parse rating from text like "4.26" or "4.26 / 5"
     */
    private fun parseRating(text: String?): Double {
        if (text == null) return 0.0
        val pattern = Regex("""(\d+\.?\d*)""")
        return pattern.find(text)?.groupValues?.get(1)?.toDoubleOrNull() ?: 0.0
    }

    /**
     * Parse number of ratings from text like "33 ratings" or "(33)"
     */
    private fun parseNumRatings(text: String?): Int {
        if (text == null) return 0
        val cleaned = text.replace(",", "")
        val pattern = Regex("""(\d+)""")
        return pattern.find(cleaned)?.value?.toIntOrNull() ?: 0
    }

    /**
     * Normalize relative URLs to absolute Royal Road URLs
     */
    private fun normalizeUrl(url: String): String {
        return when {
            url.startsWith("//") -> "https:$url"
            url.startsWith("/") -> "https://www.royalroad.com$url"
            url.isBlank() -> ""
            else -> url
        }
    }

    fun close() {
        client.close()
    }
}

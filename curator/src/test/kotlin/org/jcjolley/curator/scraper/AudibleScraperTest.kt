package org.jcjolley.curator.scraper

import org.junit.jupiter.api.Test
import strikt.api.expectThat
import strikt.assertions.*

class AudibleScraperTest {

    private val scraper = AudibleScraper()

    @Test
    fun `parseProductPage extracts title from h1`() {
        val html = """
            <html>
            <body>
                <h1 class="bc-heading">Defiance of the Fall</h1>
            </body>
            </html>
        """.trimIndent()

        val result = scraper.parseProductPage(html, "https://www.audible.com/pd/Test/B0CK123456")

        expectThat(result.title).isEqualTo("Defiance of the Fall")
    }

    @Test
    fun `parseProductPage extracts ASIN from URL`() {
        val html = """
            <html>
            <body>
                <h1>Test Book</h1>
            </body>
            </html>
        """.trimIndent()

        val result = scraper.parseProductPage(html, "https://www.audible.com/pd/Test-Book-Audiobook/B0CK123456")

        expectThat(result.audibleAsin).isEqualTo("B0CK123456")
    }

    @Test
    fun `parseProductPage extracts author info`() {
        val html = """
            <html>
            <body>
                <h1>Test Book</h1>
                <li class="authorLabel">
                    <span>By: </span>
                    <a href="/author/John-Doe">John Doe</a>
                </li>
            </body>
            </html>
        """.trimIndent()

        val result = scraper.parseProductPage(html, "https://www.audible.com/pd/Test/B0CK123456")

        expectThat(result.author).isEqualTo("John Doe")
        expectThat(result.authorUrl).isEqualTo("https://www.audible.com/author/John-Doe")
    }

    @Test
    fun `parseProductPage extracts series with position`() {
        val html = """
            <html>
            <body>
                <h1>Test Book</h1>
                <li class="seriesLabel">
                    <span>Series: </span>
                    <a href="/series/Cradle">Cradle, Book 3</a>
                </li>
            </body>
            </html>
        """.trimIndent()

        val result = scraper.parseProductPage(html, "https://www.audible.com/pd/Test/B0CK123456")

        expectThat(result.series).isEqualTo("Cradle")
        expectThat(result.seriesPosition).isEqualTo(3)
    }

    @Test
    fun `parseProductPage extracts series without position`() {
        val html = """
            <html>
            <body>
                <h1>Test Book</h1>
                <li class="seriesLabel">
                    <span>Series: </span>
                    <a href="/series/Standalone">Standalone Series</a>
                </li>
            </body>
            </html>
        """.trimIndent()

        val result = scraper.parseProductPage(html, "https://www.audible.com/pd/Test/B0CK123456")

        expectThat(result.series).isEqualTo("Standalone Series")
        expectThat(result.seriesPosition).isNull()
    }

    @Test
    fun `parseProductPage extracts rating`() {
        val html = """
            <html>
            <body>
                <h1>Test Book</h1>
                <li class="ratingsLabel">
                    <span class="bc-pub-offscreen">4.7 out of 5 stars</span>
                    <span class="bc-text">12,847 ratings</span>
                </li>
            </body>
            </html>
        """.trimIndent()

        val result = scraper.parseProductPage(html, "https://www.audible.com/pd/Test/B0CK123456")

        expectThat(result.rating).isEqualTo(4.7)
        expectThat(result.numRatings).isEqualTo(12847)
    }

    @Test
    fun `parseProductPage extracts runtime`() {
        val html = """
            <html>
            <body>
                <h1>Test Book</h1>
                <li class="runtimeLabel">
                    <span>Length: 12 hrs 34 mins</span>
                </li>
            </body>
            </html>
        """.trimIndent()

        val result = scraper.parseProductPage(html, "https://www.audible.com/pd/Test/B0CK123456")

        expectThat(result.length).isEqualTo("12 hrs 34 mins")
    }

    @Test
    fun `parseProductPage extracts description`() {
        val html = """
            <html>
            <body>
                <h1>Test Book</h1>
                <div class="bc-expander-content">
                    <span class="bc-text">This is a long description of the book that tells you about the plot and characters.</span>
                </div>
            </body>
            </html>
        """.trimIndent()

        val result = scraper.parseProductPage(html, "https://www.audible.com/pd/Test/B0CK123456")

        expectThat(result.originalDescription).contains("long description")
    }

    @Test
    fun `parseProductPage handles missing optional fields`() {
        val html = """
            <html>
            <body>
                <h1>Standalone Book</h1>
            </body>
            </html>
        """.trimIndent()

        val result = scraper.parseProductPage(html, "https://www.audible.com/pd/Test/B0CK123456")

        expectThat(result.title).isEqualTo("Standalone Book")
        expectThat(result.subtitle).isNull()
        expectThat(result.series).isNull()
        expectThat(result.seriesPosition).isNull()
        expectThat(result.rating).isEqualTo(0.0)
        expectThat(result.numRatings).isEqualTo(0)
    }

    @Test
    fun `parseProductPage extracts cover image URL`() {
        val html = """
            <html>
            <body>
                <h1>Test Book</h1>
                <img class="bc-pub-block bc-image-inset-border" src="https://m.media-amazon.com/images/I/cover.jpg" />
            </body>
            </html>
        """.trimIndent()

        val result = scraper.parseProductPage(html, "https://www.audible.com/pd/Test/B0CK123456")

        expectThat(result.imageUrl).isEqualTo("https://m.media-amazon.com/images/I/cover.jpg")
    }
}

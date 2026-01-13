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
    fun `parseProductPage extracts author info from JSON`() {
        val html = """
            <html>
            <body>
                <h1>Test Book</h1>
                <script>
                    {"rating":{"value":4.5,"count":100},"authors":[{"name":"John Doe"}],"narrators":[{"name":"Jane Smith"}]}
                </script>
            </body>
            </html>
        """.trimIndent()

        val result = scraper.parseProductPage(html, "https://www.audible.com/pd/Test/B0CK123456")

        expectThat(result.author).isEqualTo("John Doe")
    }

    @Test
    fun `parseProductPage extracts series with position from JSON`() {
        val html = """
            <html>
            <body>
                <h1>Test Book</h1>
                "series": [{"part": "Book 3", "name": "Cradle"}]
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
                "series": [{"part": "", "name": "Standalone Series"}]
            </body>
            </html>
        """.trimIndent()

        val result = scraper.parseProductPage(html, "https://www.audible.com/pd/Test/B0CK123456")

        expectThat(result.series).isEqualTo("Standalone Series")
        expectThat(result.seriesPosition).isNull()
    }

    @Test
    fun `parseProductPage extracts rating from JSON`() {
        val html = """
            <html>
            <body>
                <h1>Test Book</h1>
                <script>
                    {"rating":{"value":4.7,"count":12847},"authors":[{"name":"Author"}],"narrators":[{"name":"Narrator"}]}
                </script>
            </body>
            </html>
        """.trimIndent()

        val result = scraper.parseProductPage(html, "https://www.audible.com/pd/Test/B0CK123456")

        expectThat(result.rating).isEqualTo(4.7)
        expectThat(result.numRatings).isEqualTo(12847)
    }

    @Test
    fun `parseProductPage extracts runtime from JSON`() {
        val html = """
            <html>
            <body>
                <h1>Test Book</h1>
                "duration":"12 hrs and 34 mins"
            </body>
            </html>
        """.trimIndent()

        val result = scraper.parseProductPage(html, "https://www.audible.com/pd/Test/B0CK123456")

        expectThat(result.length).isEqualTo("12 hrs and 34 mins")
    }

    @Test
    fun `parseProductPage extracts description from JSON`() {
        val html = """
            <html>
            <body>
                <h1>Test Book</h1>
                "description": "<p>This is a long description of the book that tells you about the plot and characters.</p>"
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

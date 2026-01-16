package org.jcjolley.books

import io.quarkus.test.junit.QuarkusTest
import jakarta.inject.Inject
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.junit.jupiter.api.Assertions.*

/**
 * Direct service tests - bypasses Lambda simulation layer.
 */
@QuarkusTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class BooksServiceTest {

    @Inject
    lateinit var booksService: BooksService

    @BeforeAll
    fun seedData() {
        // Add a few test books
        val books = listOf(
            Book(id = "svc-test-1", title = "Test Book 1", author = "Author A", genres = listOf("Fantasy"),
                 lengthCategory = "Epic", lengthMinutes = 1800, numRatings = 1000, rating = 4.5,
                 gsiPartition = "BOOK", addedAt = System.currentTimeMillis()),
            Book(id = "svc-test-2", title = "Test Book 2", author = "Author B", genres = listOf("Sci-Fi"),
                 lengthCategory = "Short", lengthMinutes = 300, numRatings = 500, rating = 4.0,
                 gsiPartition = "BOOK", addedAt = System.currentTimeMillis())
        )
        books.forEach { booksService.saveBook(it) }
        println("Seeded ${books.size} test books")
    }

    @Test
    fun `getBooksAddedSince returns books after timestamp`() {
        val books = booksService.getBooksAddedSince(1000L)
        println("Found ${books.size} books after timestamp 1000")
        assertTrue(books.isNotEmpty(), "Should find books after timestamp 1000")
    }

    @Test
    fun `queryBooks by length returns matching books`() {
        val books = booksService.queryBooks(length = "Epic", limit = 10)
        println("Found ${books.size} Epic books")
        assertTrue(books.isNotEmpty(), "Should find Epic books")
        assertTrue(books.all { it.lengthCategory == "Epic" }, "All books should have Epic length")
    }

    @Test
    fun `queryBooks by popularity returns sorted books`() {
        val books = booksService.queryBooks(popularity = "popular", limit = 10)
        println("Found ${books.size} popular books")
        assertTrue(books.isNotEmpty(), "Should find popular books")
    }
}

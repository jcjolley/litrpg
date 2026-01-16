package org.jcjolley.books

import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import jakarta.inject.Inject
import org.hamcrest.Matchers.*
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance

/**
 * Integration tests for the /books endpoint query functionality.
 * Seeds test data and uses the litrpg-books-dev table in LocalStack.
 *
 * Prerequisites: Run `make localstack` before running tests.
 */
@QuarkusTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class BooksQueryTest {

    @Inject
    lateinit var booksService: BooksService

    @BeforeAll
    fun seedTestData() {
        val testBooks = listOf(
            Book(id = "test-1", title = "Defiance of the Fall", author = "TheFirstDefier",
                 genres = listOf("System Apocalypse"), lengthCategory = "Epic", lengthMinutes = 1800,
                 numRatings = 60000, rating = 4.7, gsiPartition = "BOOK"),
            Book(id = "test-2", title = "Primal Hunter", author = "Zogarth",
                 genres = listOf("System Apocalypse"), lengthCategory = "Epic", lengthMinutes = 1800,
                 numRatings = 55000, rating = 4.6, gsiPartition = "BOOK"),
            Book(id = "test-3", title = "Cradle: Unsouled", author = "Will Wight",
                 genres = listOf("Cultivation"), lengthCategory = "Medium", lengthMinutes = 600,
                 numRatings = 45000, rating = 4.8, gsiPartition = "BOOK"),
            Book(id = "test-4", title = "Cradle: Soulsmith", author = "Will Wight",
                 genres = listOf("Cultivation"), lengthCategory = "Medium", lengthMinutes = 600,
                 numRatings = 42000, rating = 4.7, gsiPartition = "BOOK"),
            Book(id = "test-5", title = "Dungeon Crawler Carl", author = "Matt Dinniman",
                 genres = listOf("Dungeon Core"), lengthCategory = "Long", lengthMinutes = 900,
                 numRatings = 50000, rating = 4.9, gsiPartition = "BOOK"),
            Book(id = "test-6", title = "He Who Fights With Monsters", author = "Shirtaloon",
                 genres = listOf("Isekai"), lengthCategory = "Epic", lengthMinutes = 1800,
                 numRatings = 35000, rating = 4.5, gsiPartition = "BOOK"),
            Book(id = "test-7", title = "The Perfect Run", author = "Maxime J. Durand",
                 genres = listOf("Time Loop"), lengthCategory = "Long", lengthMinutes = 900,
                 numRatings = 8000, rating = 4.6, gsiPartition = "BOOK"),
            Book(id = "test-8", title = "Mother of Learning", author = "nobody103",
                 genres = listOf("Time Loop"), lengthCategory = "Epic", lengthMinutes = 1800,
                 numRatings = 25000, rating = 4.7, gsiPartition = "BOOK"),
            Book(id = "test-9", title = "Beware of Chicken", author = "CasualFarmer",
                 genres = listOf("Cultivation"), lengthCategory = "Long", lengthMinutes = 900,
                 numRatings = 30000, rating = 4.8, gsiPartition = "BOOK"),
            Book(id = "test-10", title = "Legend of the Arch Magus", author = "Michael Sisa",
                 genres = listOf("Academy"), lengthCategory = "Short", lengthMinutes = 300,
                 numRatings = 500, rating = 3.9, gsiPartition = "BOOK")
        )
        testBooks.forEach { booksService.saveBook(it) }
    }

    // === Single Filter Tests ===

    @Test
    fun `query by genre returns matching books`() {
        given()
            .`when`()
            .get("/books?genres=Cultivation")
            .then()
            .statusCode(200)
            .body("size()", greaterThan(0))
            .body("findAll { it.genres.contains('Cultivation') }.size()", greaterThan(0))
            .body("findAll { !it.genres.contains('Cultivation') }.size()", equalTo(0))
    }

    @Test
    fun `query by length returns matching books`() {
        given()
            .`when`()
            .get("/books?length=Epic")
            .then()
            .statusCode(200)
            .body("size()", greaterThan(0))
            .body("findAll { it.lengthCategory == 'Epic' }.size()", greaterThan(0))
            .body("findAll { it.lengthCategory != 'Epic' }.size()", equalTo(0))
    }

    @Test
    fun `query by popularity popular returns books sorted by numRatings desc`() {
        given()
            .`when`()
            .get("/books?popularity=popular&limit=5")
            .then()
            .statusCode(200)
            .body("size()", greaterThan(0))
            // First book should have high numRatings
            .body("[0].numRatings", greaterThan(10000))
    }

    @Test
    fun `query by popularity niche returns books sorted by numRatings asc`() {
        given()
            .`when`()
            .get("/books?popularity=niche&limit=5")
            .then()
            .statusCode(200)
            .body("size()", greaterThan(0))
            // First book should have low numRatings
            .body("[0].numRatings", lessThan(10000))
    }

    @Test
    fun `query by author returns matching books`() {
        given()
            .queryParam("author", "Will Wight")
            .`when`()
            .get("/books")
            .then()
            .statusCode(200)
            .body("size()", greaterThan(0))
            .body("findAll { it.author == 'Will Wight' }.size()", greaterThan(0))
    }

    // === Combined Filter Tests ===

    @Test
    fun `combined query genre and popularity filters correctly`() {
        given()
            .`when`()
            .get("/books?genres=Cultivation&popularity=popular")
            .then()
            .statusCode(200)
            .body("size()", greaterThanOrEqualTo(0))
            .body("findAll { !it.genres.contains('Cultivation') }.size()", equalTo(0))
    }

    @Test
    fun `combined query length and popularity filters correctly`() {
        given()
            .`when`()
            .get("/books?length=Epic&popularity=niche")
            .then()
            .statusCode(200)
            .body("findAll { it.lengthCategory != 'Epic' }.size()", equalTo(0))
    }

    @Test
    fun `query with no filters returns all books with limit`() {
        given()
            .`when`()
            .get("/books?limit=5")
            .then()
            .statusCode(200)
            .body("size()", lessThanOrEqualTo(5))
    }

    @Test
    fun `query respects limit parameter`() {
        given()
            .`when`()
            .get("/books?limit=3")
            .then()
            .statusCode(200)
            .body("size()", lessThanOrEqualTo(3))
    }

    // === Incremental Sync (since) Tests ===
    // Note: These tests are disabled due to SocketTimeoutException in the Lambda mock event server.
    // The addedAt-index GSI query works correctly (verified via AWS CLI and production).
    // The timeout appears to be specific to the Quarkus Lambda test simulation layer.
    // See: docs/prd/incremental-sync.md for details.

    @Test
    @org.junit.jupiter.api.Disabled("Lambda mock server times out on addedAt-index GSI query")
    fun `query with since returns books added after timestamp`() {
        // Use a timestamp in the past - all books should be after this
        val pastTimestamp = 1000L

        given()
            .`when`()
            .get("/books?since=$pastTimestamp")
            .then()
            .statusCode(200)
            .body("size()", greaterThan(0))
    }

    @Test
    @org.junit.jupiter.api.Disabled("Lambda mock server times out on addedAt-index GSI query")
    fun `query with since returns empty when no books after timestamp`() {
        // Use a timestamp far in the future
        val futureTimestamp = System.currentTimeMillis() + 1_000_000_000L

        given()
            .`when`()
            .get("/books?since=$futureTimestamp")
            .then()
            .statusCode(200)
            .body("size()", equalTo(0))
    }

    @Test
    @org.junit.jupiter.api.Disabled("Lambda mock server times out on addedAt-index GSI query")
    fun `query with since returns subset of books`() {
        // Add test books with known timestamps
        val oldTimestamp = 1_700_000_000_000L // Oct 2023
        val newTimestamp = 1_900_000_000_000L // ~2030
        val suffix = System.currentTimeMillis()

        val oldBook = Book(
            id = "test-old-book-$suffix",
            title = "Test Old Book",
            author = "Test Author",
            genres = listOf("Test Genre"),
            lengthCategory = "Short",
            lengthMinutes = 300,
            numRatings = 100,
            rating = 3.5,
            gsiPartition = "BOOK",
            addedAt = oldTimestamp
        )
        val newBook = Book(
            id = "test-new-book-$suffix",
            title = "Test New Book",
            author = "Test Author",
            genres = listOf("Test Genre"),
            lengthCategory = "Short",
            lengthMinutes = 300,
            numRatings = 200,
            rating = 4.0,
            gsiPartition = "BOOK",
            addedAt = newTimestamp
        )

        booksService.saveBook(oldBook)
        booksService.saveBook(newBook)

        // Query for books added after the old book's timestamp
        val midTimestamp = oldTimestamp + 1

        given()
            .`when`()
            .get("/books?since=$midTimestamp")
            .then()
            .statusCode(200)
            .body("find { it.id == '${newBook.id}' }", notNullValue())
            .body("find { it.id == '${oldBook.id}' }", nullValue())
    }

    @Test
    @org.junit.jupiter.api.Disabled("Lambda mock server times out on addedAt-index GSI query")
    fun `query with since ignores other filters`() {
        // Add a test book with specific attributes
        val recentTimestamp = System.currentTimeMillis() - 1000L
        val testBookId = "test-recent-${System.currentTimeMillis()}"
        val recentBook = Book(
            id = testBookId,
            title = "Test Recent Book",
            author = "Test Author",
            genres = listOf("Test Genre"),
            lengthCategory = "Medium",
            lengthMinutes = 600,
            numRatings = 5000,
            rating = 4.2,
            gsiPartition = "BOOK",
            addedAt = recentTimestamp
        )
        booksService.saveBook(recentBook)

        // Query with since AND genre filter - since should take precedence
        val pastTimestamp = recentTimestamp - 1

        given()
            .`when`()
            .get("/books?since=$pastTimestamp&genres=Cultivation")
            .then()
            .statusCode(200)
            // Should include the test book even though genres=Cultivation is specified
            .body("find { it.id == '$testBookId' }", notNullValue())
    }
}

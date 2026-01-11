package org.jcjolley.curator.repository

import org.jcjolley.curator.model.Book
import org.junit.jupiter.api.*
import org.testcontainers.containers.GenericContainer
import org.testcontainers.containers.wait.strategy.Wait
import org.testcontainers.utility.DockerImageName
import strikt.api.expectThat
import strikt.assertions.*
import java.time.Duration
import java.time.Instant
import java.util.*

/**
 * Integration tests for BookRepository using DynamoDB Local in Testcontainers.
 * These tests require Docker to be running and accessible via TCP on port 2375.
 *
 * Docker Desktop Setup Required:
 * Settings → General → "Expose daemon on tcp://localhost:2375 without TLS"
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class BookRepositoryTest {

    companion object {
        init {
            // Docker 29+ requires API version 1.44 minimum, but Testcontainers defaults to 1.32
            // See: https://github.com/testcontainers/testcontainers-java/issues/11212
            System.setProperty("api.version", "1.44")
        }
    }

    private lateinit var dynamoDb: GenericContainer<*>
    private lateinit var repository: BookRepository

    @BeforeAll
    fun setup() {
        // Start DynamoDB Local container - requires Docker to be running
        dynamoDb = GenericContainer(DockerImageName.parse("amazon/dynamodb-local:2.5.3"))
            .withExposedPorts(8000)
            .withCommand("-jar DynamoDBLocal.jar -inMemory -sharedDb")
            .waitingFor(Wait.forListeningPort().withStartupTimeout(Duration.ofSeconds(120)))

        dynamoDb.start()

        // Create repository connected to the container
        val endpoint = "http://${dynamoDb.host}:${dynamoDb.getMappedPort(8000)}"
        repository = BookRepository(endpoint)
        repository.createTableIfNotExists()
    }

    @AfterAll
    fun cleanup() {
        if (::repository.isInitialized) {
            repository.close()
        }
        if (::dynamoDb.isInitialized) {
            dynamoDb.stop()
        }
    }

    @BeforeEach
    fun clearTable() {
        // Delete all books before each test
        repository.findAll().forEach { repository.delete(it.id) }
    }

    @Test
    fun `save and retrieve book`() {
        val book = createTestBook()

        repository.save(book)
        val retrieved = repository.findById(book.id)

        expectThat(retrieved).isNotNull()
        expectThat(retrieved!!.title).isEqualTo(book.title)
        expectThat(retrieved.author).isEqualTo(book.author)
        expectThat(retrieved.rating).isEqualTo(book.rating)
    }

    @Test
    fun `findAll returns all books`() {
        val book1 = createTestBook(title = "Book One")
        val book2 = createTestBook(title = "Book Two")
        val book3 = createTestBook(title = "Book Three")

        repository.save(book1)
        repository.save(book2)
        repository.save(book3)

        val all = repository.findAll()

        expectThat(all).hasSize(3)
        expectThat(all.map { it.title }).containsExactlyInAnyOrder("Book One", "Book Two", "Book Three")
    }

    @Test
    fun `delete removes book`() {
        val book = createTestBook()
        repository.save(book)

        expectThat(repository.findById(book.id)).isNotNull()

        val deleted = repository.delete(book.id)

        expectThat(deleted).isTrue()
        expectThat(repository.findById(book.id)).isNull()
    }

    @Test
    fun `delete returns false for non-existent book`() {
        val deleted = repository.delete("non-existent-id")
        expectThat(deleted).isFalse()
    }

    @Test
    fun `count returns correct number`() {
        expectThat(repository.count()).isEqualTo(0)

        repository.save(createTestBook())
        repository.save(createTestBook())

        expectThat(repository.count()).isEqualTo(2)
    }

    @Test
    fun `update book preserves id`() {
        val book = createTestBook(title = "Original Title")
        repository.save(book)

        val updated = book.copy(title = "Updated Title", updatedAt = Instant.now())
        repository.save(updated)

        val retrieved = repository.findById(book.id)

        expectThat(retrieved).isNotNull()
        expectThat(retrieved!!.title).isEqualTo("Updated Title")
        expectThat(repository.count()).isEqualTo(1)
    }

    @Test
    fun `book with all fields is persisted correctly`() {
        val book = Book(
            id = UUID.randomUUID().toString(),
            title = "Defiance of the Fall",
            subtitle = "A LitRPG Adventure",
            author = "TheFirstDefier",
            authorUrl = "https://www.audible.com/author/TheFirstDefier",
            series = "Defiance of the Fall",
            seriesPosition = 1,
            length = "12 hrs 34 mins",
            releaseDate = "01-15-2022",
            language = "English",
            imageUrl = "https://example.com/cover.jpg",
            audibleUrl = "https://www.audible.com/pd/...",
            audibleAsin = "B09XYZ1234",
            rating = 4.7,
            numRatings = 12847,
            description = "When the System arrives, Zac must survive. System Apocalypse.",
            wishlistCount = 100,
            clickThroughCount = 50,
            notInterestedCount = 10,
            impressionCount = 500
        )

        repository.save(book)
        val retrieved = repository.findById(book.id)!!

        expectThat(retrieved.subtitle).isEqualTo("A LitRPG Adventure")
        expectThat(retrieved.series).isEqualTo("Defiance of the Fall")
        expectThat(retrieved.seriesPosition).isEqualTo(1)
        expectThat(retrieved.numRatings).isEqualTo(12847)
        expectThat(retrieved.wishlistCount).isEqualTo(100)
        expectThat(retrieved.impressionCount).isEqualTo(500)
    }

    private fun createTestBook(
        title: String = "Test Book ${UUID.randomUUID().toString().take(8)}"
    ): Book {
        return Book(
            id = UUID.randomUUID().toString(),
            title = title,
            author = "Test Author",
            length = "10 hrs 30 mins",
            releaseDate = "01-01-2024",
            imageUrl = "https://example.com/cover.jpg",
            audibleUrl = "https://www.audible.com/pd/test",
            audibleAsin = "B0TEST123",
            rating = 4.5,
            numRatings = 100,
            description = "A test book description."
        )
    }

}

package org.jcjolley.curator.commands

import com.github.ajalt.clikt.core.parse
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import org.jcjolley.curator.llm.LlamaSummarizer
import org.jcjolley.curator.llm.SummarizationResult
import org.jcjolley.curator.model.Book
import org.jcjolley.curator.model.BookFacts
import org.jcjolley.curator.model.ScrapedBook
import org.jcjolley.curator.repository.BookRepository
import org.jcjolley.curator.scraper.AudibleScraper
import org.junit.jupiter.api.*
import org.testcontainers.containers.GenericContainer
import org.testcontainers.containers.wait.strategy.Wait
import org.testcontainers.utility.DockerImageName
import strikt.api.expectThat
import strikt.assertions.*
import java.io.ByteArrayOutputStream
import java.io.PrintStream
import java.time.Duration
import java.time.Instant
import java.util.*

/**
 * Integration tests for MigrateCommand using DynamoDB Local in Testcontainers.
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class MigrateCommandTest {

    companion object {
        init {
            System.setProperty("api.version", "1.44")
        }
    }

    private lateinit var dynamoDb: GenericContainer<*>
    private lateinit var repository: BookRepository
    private lateinit var dynamoEndpoint: String

    @BeforeAll
    fun setup() {
        dynamoDb = GenericContainer(DockerImageName.parse("amazon/dynamodb-local:2.5.3"))
            .withExposedPorts(8000)
            .withCommand("-jar DynamoDBLocal.jar -inMemory -sharedDb")
            .waitingFor(Wait.forListeningPort().withStartupTimeout(Duration.ofSeconds(120)))

        dynamoDb.start()

        dynamoEndpoint = "http://${dynamoDb.host}:${dynamoDb.getMappedPort(8000)}"
        repository = BookRepository(dynamoEndpoint)
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
        repository.findAll().forEach { repository.delete(it.id) }
    }

    @Test
    fun `migrate adds lengthMinutes and lengthCategory to old-format book`() {
        // Given: a book without GSI fields (simulating old format)
        val oldBook = createOldFormatBook(
            title = "Test Book",
            length = "12 hrs and 30 mins"
        )
        repository.save(oldBook)

        // When: we run migrate with --skip-llm (to avoid LLM dependency)
        val command = MigrateCommand(
            repositoryProvider = { BookRepository(dynamoEndpoint) }
        )
        val output = captureOutput {
            command.parse(listOf("--dynamo", dynamoEndpoint, "--skip-llm"))
        }

        // Then: the book should have length fields populated
        val migrated = repository.findById(oldBook.id)!!
        expectThat(migrated.lengthMinutes).isEqualTo(750) // 12*60 + 30
        expectThat(migrated.lengthCategory).isEqualTo("Long") // 720-1440 mins
        expectThat(migrated.gsiPartition).isEqualTo("BOOK")
    }

    @Test
    fun `migrate skips book when all GSI fields are already present`() {
        // Given: a fully migrated book
        val migratedBook = createFullyMigratedBook(title = "Already Migrated")
        repository.save(migratedBook)

        // When: we run migrate
        val command = MigrateCommand(
            repositoryProvider = { BookRepository(dynamoEndpoint) }
        )
        val output = captureOutput {
            command.parse(listOf("--dynamo", dynamoEndpoint, "--skip-llm"))
        }

        // Then: the book should be skipped
        expectThat(output).contains("Skipping Already Migrated")
        expectThat(output).contains("already migrated")
    }

    @Test
    fun `migrate with --dry-run does not persist changes`() {
        // Given: an old format book
        val oldBook = createOldFormatBook(
            title = "Dry Run Test",
            length = "8 hrs 15 mins"
        )
        repository.save(oldBook)

        // When: we run migrate with --dry-run
        val command = MigrateCommand(
            repositoryProvider = { BookRepository(dynamoEndpoint) }
        )
        captureOutput {
            command.parse(listOf("--dynamo", dynamoEndpoint, "--skip-llm", "--dry-run"))
        }

        // Then: the book should NOT be updated
        val unchanged = repository.findById(oldBook.id)!!
        expectThat(unchanged.lengthMinutes).isNull()
        expectThat(unchanged.lengthCategory).isNull()
    }

    @Test
    fun `migrate with --skip-llm only updates length fields, leaves genre null`() {
        // Given: an old format book without genre
        val oldBook = createOldFormatBook(
            title = "Skip LLM Test",
            length = "5 hrs 30 mins"
        )
        repository.save(oldBook)

        // When: we run migrate with --skip-llm
        val command = MigrateCommand(
            repositoryProvider = { BookRepository(dynamoEndpoint) }
        )
        captureOutput {
            command.parse(listOf("--dynamo", dynamoEndpoint, "--skip-llm"))
        }

        // Then: length fields updated but genre stays null
        val migrated = repository.findById(oldBook.id)!!
        expectThat(migrated.lengthMinutes).isEqualTo(330) // 5*60 + 30
        expectThat(migrated.lengthCategory).isEqualTo("Short") // < 360 mins
        expectThat(migrated.genre).isNull()
    }

    @Test
    fun `migrate with --force re-processes already-migrated books`() {
        // Given: a "migrated" book that we want to re-process
        val book = createFullyMigratedBook(title = "Force Test").copy(
            lengthMinutes = 999, // Wrong value we want to fix
            lengthCategory = "Wrong"
        )
        repository.save(book)

        // When: we run migrate with --force
        val command = MigrateCommand(
            repositoryProvider = { BookRepository(dynamoEndpoint) }
        )
        captureOutput {
            command.parse(listOf("--dynamo", dynamoEndpoint, "--skip-llm", "--force"))
        }

        // Then: the book should be re-processed with correct values
        val migrated = repository.findById(book.id)!!
        expectThat(migrated.lengthMinutes).isEqualTo(750) // 12*60 + 30 from length string
        expectThat(migrated.lengthCategory).isEqualTo("Long")
    }

    @Test
    fun `migrate handles book with missing optional fields gracefully`() {
        // Given: a minimal book with only required fields
        val minimalBook = Book(
            id = UUID.randomUUID().toString(),
            title = "Minimal Book",
            author = "Unknown Author",
            length = "3 hrs",
            releaseDate = "01-01-2024",
            imageUrl = "https://example.com/cover.jpg",
            audibleUrl = "https://www.audible.com/pd/test",
            audibleAsin = "B0TEST123",
            rating = 4.0,
            numRatings = 10,
            description = "A book."
        )
        repository.save(minimalBook)

        // When: we run migrate
        val command = MigrateCommand(
            repositoryProvider = { BookRepository(dynamoEndpoint) }
        )
        captureOutput {
            command.parse(listOf("--dynamo", dynamoEndpoint, "--skip-llm"))
        }

        // Then: migration should succeed
        val migrated = repository.findById(minimalBook.id)!!
        expectThat(migrated.lengthMinutes).isEqualTo(180) // 3*60
        expectThat(migrated.lengthCategory).isEqualTo("Short")
        expectThat(migrated.gsiPartition).isEqualTo("BOOK")
    }

    @Test
    fun `migrate with LLM extracts genre from Audible description`() {
        // Given: an old format book
        val oldBook = createOldFormatBook(
            title = "LLM Test",
            length = "10 hrs"
        )
        repository.save(oldBook)

        // Mock scraper and summarizer
        val mockScraper = mockk<AudibleScraper>()
        val mockSummarizer = mockk<LlamaSummarizer>()

        // Setup mock behaviors
        every { mockScraper.close() } returns Unit
        coEvery { mockScraper.scrapeBook(any()) } returns ScrapedBook(
            title = "LLM Test",
            subtitle = null,
            author = "Test Author",
            authorUrl = null,
            series = null,
            seriesPosition = null,
            length = "10 hrs",
            releaseDate = "01-01-2024",
            language = "English",
            imageUrl = "https://example.com/cover.jpg",
            audibleUrl = "https://www.audible.com/pd/test",
            audibleAsin = "B0TEST123",
            rating = 4.5,
            numRatings = 100,
            originalDescription = "A cultivation story about becoming powerful.",
            narrator = "Test Narrator"
        )

        coEvery { mockSummarizer.summarize(any()) } returns SummarizationResult(
            facts = BookFacts(
                protagonist = "Test Hero",
                setting = "Fantasy world",
                problem = "Weak to strong",
                incitingIncident = "Awakening",
                goal = "Power",
                tone = "epic",
                genre = "Cultivation"
            ),
            blurb = "Test blurb. Cultivation.",
            wordCount = 35
        )

        // When: we run migrate with LLM
        val command = MigrateCommand(
            repositoryProvider = { BookRepository(dynamoEndpoint) },
            scraperProvider = { mockScraper },
            summarizerProvider = { _, _ -> mockSummarizer }
        )
        captureOutput {
            command.parse(listOf("--dynamo", dynamoEndpoint))
        }

        // Then: genre should be extracted
        val migrated = repository.findById(oldBook.id)!!
        expectThat(migrated.genre).isEqualTo("Cultivation")
        expectThat(migrated.lengthMinutes).isEqualTo(600)
        expectThat(migrated.lengthCategory).isEqualTo("Medium")
    }

    // Helper functions

    private fun createOldFormatBook(title: String, length: String): Book {
        return Book(
            id = UUID.randomUUID().toString(),
            title = title,
            author = "Test Author",
            length = length,
            releaseDate = "01-01-2024",
            imageUrl = "https://example.com/cover.jpg",
            audibleUrl = "https://www.audible.com/pd/test",
            audibleAsin = "B0TEST123",
            rating = 4.5,
            numRatings = 100,
            description = "A test book description.",
            // Explicitly set new fields to null to simulate old format
            genre = null,
            lengthMinutes = null,
            lengthCategory = null,
            gsiPartition = "BOOK" // Default, but won't be in old DDB records
        )
    }

    private fun createFullyMigratedBook(title: String): Book {
        return Book(
            id = UUID.randomUUID().toString(),
            title = title,
            author = "Test Author",
            length = "12 hrs and 30 mins",
            releaseDate = "01-01-2024",
            imageUrl = "https://example.com/cover.jpg",
            audibleUrl = "https://www.audible.com/pd/test",
            audibleAsin = "B0TEST123",
            rating = 4.5,
            numRatings = 100,
            description = "A test book description.",
            genre = "System Apocalypse",
            lengthMinutes = 750,
            lengthCategory = "Long",
            gsiPartition = "BOOK"
        )
    }

    private fun captureOutput(block: () -> Unit): String {
        val originalOut = System.out
        val outputStream = ByteArrayOutputStream()
        System.setOut(PrintStream(outputStream))
        try {
            block()
        } finally {
            System.setOut(originalOut)
        }
        return outputStream.toString()
    }
}

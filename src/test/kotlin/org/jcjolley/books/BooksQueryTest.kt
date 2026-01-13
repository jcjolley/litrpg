package org.jcjolley.books

import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import jakarta.inject.Inject
import org.hamcrest.Matchers.*
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import software.amazon.awssdk.services.dynamodb.DynamoDbClient
import software.amazon.awssdk.services.dynamodb.model.*

/**
 * Integration tests for the /books endpoint query functionality.
 * Creates DynamoDB table with GSIs and seeds test data before tests run.
 */
@QuarkusTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class BooksQueryTest {

    @Inject
    lateinit var dynamoDbClient: DynamoDbClient

    @Inject
    lateinit var booksService: BooksService

    companion object {
        const val TABLE_NAME = "Books"
    }

    @BeforeAll
    fun setupTable() {
        // Delete existing table if present
        try {
            dynamoDbClient.deleteTable { it.tableName(TABLE_NAME) }
            dynamoDbClient.waiter().waitUntilTableNotExists { it.tableName(TABLE_NAME) }
        } catch (e: ResourceNotFoundException) {
            // Table doesn't exist, that's fine
        }

        // Create table with all GSIs
        dynamoDbClient.createTable { builder ->
            builder.tableName(TABLE_NAME)
                .billingMode(BillingMode.PAY_PER_REQUEST)
                .keySchema(
                    KeySchemaElement.builder()
                        .attributeName("id")
                        .keyType(KeyType.HASH)
                        .build()
                )
                .attributeDefinitions(
                    // Primary key
                    AttributeDefinition.builder()
                        .attributeName("id")
                        .attributeType(ScalarAttributeType.S)
                        .build(),
                    // GSI attributes
                    AttributeDefinition.builder()
                        .attributeName("author")
                        .attributeType(ScalarAttributeType.S)
                        .build(),
                    AttributeDefinition.builder()
                        .attributeName("genre")
                        .attributeType(ScalarAttributeType.S)
                        .build(),
                    AttributeDefinition.builder()
                        .attributeName("gsiPartition")
                        .attributeType(ScalarAttributeType.S)
                        .build(),
                    AttributeDefinition.builder()
                        .attributeName("lengthCategory")
                        .attributeType(ScalarAttributeType.S)
                        .build(),
                    AttributeDefinition.builder()
                        .attributeName("rating")
                        .attributeType(ScalarAttributeType.N)
                        .build(),
                    AttributeDefinition.builder()
                        .attributeName("numRatings")
                        .attributeType(ScalarAttributeType.N)
                        .build()
                )
                .globalSecondaryIndexes(
                    // author-index: Query by author, sorted by rating
                    GlobalSecondaryIndex.builder()
                        .indexName("author-index")
                        .keySchema(
                            KeySchemaElement.builder().attributeName("author").keyType(KeyType.HASH).build(),
                            KeySchemaElement.builder().attributeName("rating").keyType(KeyType.RANGE).build()
                        )
                        .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                        .build(),
                    // genre-index: Query by genre, sorted by numRatings
                    GlobalSecondaryIndex.builder()
                        .indexName("genre-index")
                        .keySchema(
                            KeySchemaElement.builder().attributeName("genre").keyType(KeyType.HASH).build(),
                            KeySchemaElement.builder().attributeName("numRatings").keyType(KeyType.RANGE).build()
                        )
                        .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                        .build(),
                    // popularity-index: Query all books sorted by numRatings
                    GlobalSecondaryIndex.builder()
                        .indexName("popularity-index")
                        .keySchema(
                            KeySchemaElement.builder().attributeName("gsiPartition").keyType(KeyType.HASH).build(),
                            KeySchemaElement.builder().attributeName("numRatings").keyType(KeyType.RANGE).build()
                        )
                        .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                        .build(),
                    // length-index: Query by length category, sorted by rating
                    GlobalSecondaryIndex.builder()
                        .indexName("length-index")
                        .keySchema(
                            KeySchemaElement.builder().attributeName("lengthCategory").keyType(KeyType.HASH).build(),
                            KeySchemaElement.builder().attributeName("rating").keyType(KeyType.RANGE).build()
                        )
                        .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                        .build()
                )
        }

        dynamoDbClient.waiter().waitUntilTableExists { it.tableName(TABLE_NAME) }

        // Seed test data
        seedTestData()
    }

    private fun seedTestData() {
        val testBooks = listOf(
            createTestBook("1", "Defiance of the Fall", "TheFirstDefier", "System Apocalypse", "Epic", 60000, 4.7),
            createTestBook("2", "Primal Hunter", "Zogarth", "System Apocalypse", "Epic", 55000, 4.6),
            createTestBook("3", "Cradle: Unsouled", "Will Wight", "Cultivation", "Medium", 45000, 4.8),
            createTestBook("4", "Cradle: Soulsmith", "Will Wight", "Cultivation", "Medium", 42000, 4.7),
            createTestBook("5", "Dungeon Crawler Carl", "Matt Dinniman", "Dungeon Core", "Long", 50000, 4.9),
            createTestBook("6", "He Who Fights With Monsters", "Shirtaloon", "Isekai", "Epic", 35000, 4.5),
            createTestBook("7", "The Perfect Run", "Maxime J. Durand", "Time Loop", "Long", 8000, 4.6),
            createTestBook("8", "Mother of Learning", "nobody103", "Time Loop", "Epic", 25000, 4.7),
            createTestBook("9", "Beware of Chicken", "CasualFarmer", "Cultivation", "Long", 30000, 4.8),
            createTestBook("10", "Legend of the Arch Magus", "Michael Sisa", "Academy", "Short", 500, 3.9)
        )

        testBooks.forEach { book ->
            booksService.saveBook(book)
        }
    }

    private fun createTestBook(
        id: String,
        title: String,
        author: String,
        genre: String,
        lengthCategory: String,
        numRatings: Int,
        rating: Double
    ): Book {
        return Book(
            id = id,
            title = title,
            author = author,
            genre = genre,
            lengthCategory = lengthCategory,
            lengthMinutes = when (lengthCategory) {
                "Short" -> 300
                "Medium" -> 600
                "Long" -> 900
                "Epic" -> 1800
                else -> 600
            },
            numRatings = numRatings,
            rating = rating,
            gsiPartition = "BOOK"
        )
    }

    // === Single Filter Tests ===

    @Test
    fun `query by genre returns matching books`() {
        given()
            .`when`()
            .get("/books?genre=Cultivation")
            .then()
            .statusCode(200)
            .body("size()", greaterThan(0))
            .body("findAll { it.genre == 'Cultivation' }.size()", greaterThan(0))
            .body("findAll { it.genre != 'Cultivation' }.size()", equalTo(0))
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
            // First book should have highest numRatings
            .body("[0].numRatings", greaterThanOrEqualTo(50000))
    }

    @Test
    fun `query by popularity niche returns books sorted by numRatings asc`() {
        given()
            .`when`()
            .get("/books?popularity=niche&limit=5")
            .then()
            .statusCode(200)
            .body("size()", greaterThan(0))
            // First book should have lowest numRatings
            .body("[0].numRatings", lessThanOrEqualTo(1000))
    }

    @Test
    fun `query by author returns matching books`() {
        given()
            .queryParam("author", "Will Wight")
            .`when`()
            .get("/books")
            .then()
            .statusCode(200)
            .body("size()", equalTo(2))
            .body("findAll { it.author == 'Will Wight' }.size()", equalTo(2))
    }

    // === Combined Filter Tests ===

    @Test
    fun `combined query genre and popularity filters correctly`() {
        given()
            .`when`()
            .get("/books?genre=Cultivation&popularity=popular")
            .then()
            .statusCode(200)
            .body("size()", greaterThan(0))
            .body("findAll { it.genre != 'Cultivation' }.size()", equalTo(0))
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
    fun `combined query genre and length filters correctly`() {
        given()
            .queryParam("genre", "Time Loop")
            .queryParam("length", "Long")
            .`when`()
            .get("/books")
            .then()
            .statusCode(200)
            .body("size()", equalTo(1))
            .body("[0].title", equalTo("The Perfect Run"))
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
}

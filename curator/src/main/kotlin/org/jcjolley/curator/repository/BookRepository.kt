package org.jcjolley.curator.repository

import mu.KotlinLogging
import org.jcjolley.curator.model.Book
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable
import software.amazon.awssdk.enhanced.dynamodb.Key
import software.amazon.awssdk.enhanced.dynamodb.TableSchema
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.dynamodb.DynamoDbClient
import software.amazon.awssdk.services.dynamodb.model.*
import java.net.URI
import java.time.Instant

private val logger = KotlinLogging.logger {}

class BookRepository(
    endpoint: String? = null,  // null for real AWS, "http://localhost:8000" for local/testcontainers
    tableName: String? = null, // null uses env var or default
    region: Region = getRegion()
) {
    private val dynamoDbClient: DynamoDbClient
    private val enhancedClient: DynamoDbEnhancedClient
    private val booksTable: DynamoDbTable<BookEntity>
    val tableName: String

    companion object {
        const val DEFAULT_TABLE_NAME = "litrpg-books-dev"

        fun getTableName(): String {
            return System.getenv("DYNAMODB_TABLE_NAME") ?: DEFAULT_TABLE_NAME
        }

        fun getRegion(): Region {
            val regionStr = System.getenv("AWS_REGION") ?: System.getenv("AWS_DEFAULT_REGION") ?: "us-east-1"
            return Region.of(regionStr)
        }
    }

    init {
        this.tableName = tableName ?: getTableName()

        val clientBuilder = DynamoDbClient.builder()
            .region(region)

        if (endpoint != null) {
            // Local/Testcontainers setup
            clientBuilder
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(
                    StaticCredentialsProvider.create(
                        AwsBasicCredentials.create("dummy", "dummy")
                    )
                )
        }

        dynamoDbClient = clientBuilder.build()
        enhancedClient = DynamoDbEnhancedClient.builder()
            .dynamoDbClient(dynamoDbClient)
            .build()

        booksTable = enhancedClient.table(this.tableName, TableSchema.fromBean(BookEntity::class.java))
    }

    /**
     * Create the table if it doesn't exist (for local/test setup)
     */
    fun createTableIfNotExists() {
        try {
            dynamoDbClient.describeTable { it.tableName(tableName) }
            logger.debug { "Table $tableName already exists" }
        } catch (e: ResourceNotFoundException) {
            logger.info { "Creating table $tableName..." }

            dynamoDbClient.createTable { builder ->
                builder.tableName(tableName)
                    .keySchema(
                        KeySchemaElement.builder()
                            .attributeName("id")
                            .keyType(KeyType.HASH)
                            .build()
                    )
                    .attributeDefinitions(
                        AttributeDefinition.builder()
                            .attributeName("id")
                            .attributeType(ScalarAttributeType.S)
                            .build()
                    )
                    .billingMode(BillingMode.PAY_PER_REQUEST)
            }

            // Wait for table to be active
            dynamoDbClient.waiter().waitUntilTableExists { it.tableName(tableName) }
            logger.info { "Table $tableName created successfully" }
        }
    }

    fun save(book: Book): Book {
        val entity = book.toEntity()
        booksTable.putItem(entity)
        logger.debug { "Saved book: ${book.title} (${book.id})" }
        return book
    }

    fun findById(id: String): Book? {
        val key = Key.builder().partitionValue(id).build()
        return booksTable.getItem(key)?.toBook()
    }

    fun findAll(): List<Book> {
        return booksTable.scan()
            .items()
            .map { it.toBook() }
    }

    fun delete(id: String): Boolean {
        val key = Key.builder().partitionValue(id).build()
        val existing = booksTable.getItem(key)
        return if (existing != null) {
            booksTable.deleteItem(key)
            logger.debug { "Deleted book: $id" }
            true
        } else {
            false
        }
    }

    fun count(): Long {
        return booksTable.scan().items().count().toLong()
    }

    fun close() {
        dynamoDbClient.close()
    }
}

/**
 * DynamoDB entity class with bean-style getters/setters required by the enhanced client
 */
@DynamoDbBean
data class BookEntity(
    @get:DynamoDbPartitionKey
    var id: String = "",
    var title: String = "",
    var subtitle: String? = null,
    var author: String = "",
    var authorUrl: String? = null,
    var narrator: String? = null,
    var series: String? = null,
    var seriesPosition: Int? = null,
    var length: String? = null,             // Audio length (Audible only)
    var releaseDate: String? = null,
    var language: String = "English",
    var imageUrl: String = "",
    // Source-specific fields
    var source: String = "AUDIBLE",         // "AUDIBLE" or "ROYAL_ROAD"
    var audibleUrl: String? = null,
    var audibleAsin: String? = null,
    var royalRoadUrl: String? = null,
    var royalRoadId: String? = null,
    var rating: Double = 0.0,
    var numRatings: Int = 0,
    var pageCount: Int? = null,             // Royal Road page count
    var description: String = "",
    var wishlistCount: Int = 0,
    var clickThroughCount: Int = 0,
    var notInterestedCount: Int = 0,
    var impressionCount: Int = 0,
    // GSI filter fields
    var genre: String? = null,
    var lengthMinutes: Int? = null,
    var lengthCategory: String? = null,
    var gsiPartition: String = "BOOK",
    var addedAt: Long = 0,  // epoch millis
    var updatedAt: Long = 0  // epoch millis
)

// Extension functions for conversion
fun Book.toEntity() = BookEntity(
    id = id,
    title = title,
    subtitle = subtitle,
    author = author,
    authorUrl = authorUrl,
    narrator = narrator,
    series = series,
    seriesPosition = seriesPosition,
    length = length,
    releaseDate = releaseDate,
    language = language,
    imageUrl = imageUrl,
    source = source,
    audibleUrl = audibleUrl,
    audibleAsin = audibleAsin,
    royalRoadUrl = royalRoadUrl,
    royalRoadId = royalRoadId,
    rating = rating,
    numRatings = numRatings,
    pageCount = pageCount,
    description = description,
    wishlistCount = wishlistCount,
    clickThroughCount = clickThroughCount,
    notInterestedCount = notInterestedCount,
    impressionCount = impressionCount,
    genre = genre,
    lengthMinutes = lengthMinutes,
    lengthCategory = lengthCategory,
    gsiPartition = gsiPartition,
    addedAt = addedAt.toEpochMilli(),
    updatedAt = updatedAt.toEpochMilli()
)

fun BookEntity.toBook() = Book(
    id = id,
    title = title,
    subtitle = subtitle,
    author = author,
    authorUrl = authorUrl,
    narrator = narrator,
    series = series,
    seriesPosition = seriesPosition,
    length = length,
    releaseDate = releaseDate,
    language = language,
    imageUrl = imageUrl,
    source = source,
    audibleUrl = audibleUrl,
    audibleAsin = audibleAsin,
    royalRoadUrl = royalRoadUrl,
    royalRoadId = royalRoadId,
    rating = rating,
    numRatings = numRatings,
    pageCount = pageCount,
    description = description,
    wishlistCount = wishlistCount,
    clickThroughCount = clickThroughCount,
    notInterestedCount = notInterestedCount,
    impressionCount = impressionCount,
    genre = genre,
    lengthMinutes = lengthMinutes,
    lengthCategory = lengthCategory,
    gsiPartition = gsiPartition,
    addedAt = Instant.ofEpochMilli(addedAt),
    updatedAt = Instant.ofEpochMilli(updatedAt)
)

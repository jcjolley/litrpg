package org.jcjolley.books

import jakarta.enterprise.context.ApplicationScoped
import org.eclipse.microprofile.config.inject.ConfigProperty
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient
import software.amazon.awssdk.enhanced.dynamodb.Key
import software.amazon.awssdk.enhanced.dynamodb.TableSchema
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional

@ApplicationScoped
class BooksService(
    private val dynamoDbEnhancedClient: DynamoDbEnhancedClient,
    @ConfigProperty(name = "dynamodb.table.name", defaultValue = "litrpg-books-dev")
    private val tableName: String
) {
    private val bookTable by lazy {
        dynamoDbEnhancedClient.table(tableName, TableSchema.fromBean(Book::class.java))
    }

    fun getBooks(): List<Book> {
        return bookTable.scan().items().toList()
    }

    fun getBook(id: String): Book? {
        return bookTable.getItem { it.key { k -> k.partitionValue(id) } }
    }

    fun getRandomBook(): Book? {
        val books = getBooks()
        return if (books.isNotEmpty()) books.random() else null
    }

    fun incrementImpression(id: String): Boolean {
        val book = getBook(id) ?: return false
        book.impressionCount += 1
        book.updatedAt = java.time.Instant.now().toEpochMilli()
        bookTable.putItem(book)
        return true
    }

    fun incrementWishlist(id: String): Boolean {
        val book = getBook(id) ?: return false
        book.wishlistCount += 1
        book.updatedAt = java.time.Instant.now().toEpochMilli()
        bookTable.putItem(book)
        return true
    }

    fun incrementClickThrough(id: String): Boolean {
        val book = getBook(id) ?: return false
        book.clickThroughCount += 1
        book.updatedAt = java.time.Instant.now().toEpochMilli()
        bookTable.putItem(book)
        return true
    }

    fun incrementNotInterested(id: String): Boolean {
        val book = getBook(id) ?: return false
        book.notInterestedCount += 1
        book.updatedAt = java.time.Instant.now().toEpochMilli()
        bookTable.putItem(book)
        return true
    }

    // GSI Query Methods

    /**
     * Query books by author using GSI, sorted by rating descending
     */
    fun getBooksByAuthor(author: String, limit: Int = 20): List<Book> {
        val index = bookTable.index("author-index")
        val queryConditional = QueryConditional.keyEqualTo(
            Key.builder().partitionValue(author).build()
        )
        return index.query { r ->
            r.queryConditional(queryConditional)
                .scanIndexForward(false)  // Descending by rating
                .limit(limit)
        }.flatMap { it.items() }.toList()
    }

    /**
     * Query books by subgenre using GSI, sorted by numRatings descending
     */
    fun getBooksBySubgenre(subgenre: String, limit: Int = 20): List<Book> {
        val index = bookTable.index("subgenre-index")
        val queryConditional = QueryConditional.keyEqualTo(
            Key.builder().partitionValue(subgenre).build()
        )
        return index.query { r ->
            r.queryConditional(queryConditional)
                .scanIndexForward(false)  // Descending by numRatings (most popular first)
                .limit(limit)
        }.flatMap { it.items() }.toList()
    }

    /**
     * Query popular books (high numRatings) or niche books (low numRatings)
     * Uses the gsiPartition="BOOK" fixed key to query all items sorted by numRatings
     */
    fun getBooksByPopularity(popular: Boolean, limit: Int = 20): List<Book> {
        val index = bookTable.index("popularity-index")
        val queryConditional = QueryConditional.keyEqualTo(
            Key.builder().partitionValue("BOOK").build()
        )
        return index.query { r ->
            r.queryConditional(queryConditional)
                .scanIndexForward(!popular)  // false = descending (popular), true = ascending (niche)
                .limit(limit)
        }.flatMap { it.items() }.toList()
    }

    /**
     * Query books by length category using GSI, sorted by rating descending
     */
    fun getBooksByLength(lengthCategory: String, limit: Int = 20): List<Book> {
        val index = bookTable.index("length-index")
        val queryConditional = QueryConditional.keyEqualTo(
            Key.builder().partitionValue(lengthCategory).build()
        )
        return index.query { r ->
            r.queryConditional(queryConditional)
                .scanIndexForward(false)  // Descending by rating
                .limit(limit)
        }.flatMap { it.items() }.toList()
    }
}

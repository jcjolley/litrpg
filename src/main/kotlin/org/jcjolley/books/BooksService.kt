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

    fun saveBook(book: Book): Book {
        bookTable.putItem(book)
        return book
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

    fun incrementUpvote(id: String): Boolean {
        val book = getBook(id) ?: return false
        book.upvoteCount += 1
        book.updatedAt = java.time.Instant.now().toEpochMilli()
        bookTable.putItem(book)
        return true
    }

    fun incrementDownvote(id: String): Boolean {
        val book = getBook(id) ?: return false
        book.downvoteCount += 1
        book.updatedAt = java.time.Instant.now().toEpochMilli()
        bookTable.putItem(book)
        return true
    }

    /**
     * Query books with combined filters using in-memory filtering.
     * All filtering is done in-memory after a full table scan.
     */
    fun queryBooks(
        author: String? = null,
        narrator: String? = null,
        genres: List<String>? = null,  // OR logic: match any genre
        excludeGenres: List<String>? = null,  // Exclude books with any of these genres
        popularity: String? = null,  // "popular" or "niche"
        length: String? = null,       // "Short", "Medium", "Long", "Epic"
        source: String? = null,       // "AUDIBLE" or "ROYAL_ROAD"
        limit: Int = 50
    ): List<Book> {
        var filtered = getBooks().asSequence()

        // Apply filters
        if (author != null) {
            filtered = filtered.filter { it.author.equals(author, ignoreCase = true) }
        }
        if (narrator != null) {
            filtered = filtered.filter { it.narrator?.equals(narrator, ignoreCase = true) == true }
        }
        if (!genres.isNullOrEmpty()) {
            // OR logic: book must have at least one of the specified genres
            filtered = filtered.filter { book ->
                book.genres.any { it in genres }
            }
        }
        if (!excludeGenres.isNullOrEmpty()) {
            // Exclude books that have any of the excluded genres
            filtered = filtered.filter { book ->
                book.genres.none { it in excludeGenres }
            }
        }
        if (length != null) {
            filtered = filtered.filter { it.lengthCategory.equals(length, ignoreCase = true) }
        }
        if (source != null) {
            filtered = filtered.filter { it.source.equals(source, ignoreCase = true) }
        }

        // Apply sorting by popularity
        val sorted = if (popularity != null) {
            val isPopular = popularity.equals("popular", ignoreCase = true)
            if (isPopular) {
                filtered.sortedByDescending { it.numRatings }
            } else {
                filtered.sortedBy { it.numRatings }
            }
        } else {
            filtered
        }

        return sorted.take(limit).toList()
    }

    /**
     * Get distinct authors from the catalog, optionally filtered by search term.
     * Results are sorted with prefix matches first, then alphabetically.
     */
    fun getDistinctAuthors(search: String? = null, limit: Int = 20): List<String> {
        val allAuthors = getBooks()
            .map { it.author }
            .filter { it.isNotBlank() }
            .distinct()

        return if (search.isNullOrBlank()) {
            allAuthors.sorted().take(limit)
        } else {
            // Prioritize prefix matches over substring matches
            val (prefixMatches, substringMatches) = allAuthors
                .filter { it.contains(search, ignoreCase = true) }
                .partition { it.startsWith(search, ignoreCase = true) }

            (prefixMatches.sorted() + substringMatches.sorted()).take(limit)
        }
    }

    /**
     * Get distinct narrators from the catalog, optionally filtered by search term.
     * Results are sorted with prefix matches first, then alphabetically.
     */
    fun getDistinctNarrators(search: String? = null, limit: Int = 20): List<String> {
        val allNarrators = getBooks()
            .mapNotNull { it.narrator }
            .filter { it.isNotBlank() }
            .distinct()

        return if (search.isNullOrBlank()) {
            allNarrators.sorted().take(limit)
        } else {
            // Prioritize prefix matches over substring matches
            val (prefixMatches, substringMatches) = allNarrators
                .filter { it.contains(search, ignoreCase = true) }
                .partition { it.startsWith(search, ignoreCase = true) }

            (prefixMatches.sorted() + substringMatches.sorted()).take(limit)
        }
    }

    /**
     * Get books added after a given timestamp using the addedAt-index GSI.
     * Returns books sorted by addedAt ascending (oldest first).
     */
    fun getBooksAddedSince(since: Long, limit: Int = 1000): List<Book> {
        val index = bookTable.index("addedAt-index")
        val queryConditional = QueryConditional.sortGreaterThan(
            Key.builder()
                .partitionValue("BOOK")
                .sortValue(since)
                .build()
        )
        return index.query { r ->
            r.queryConditional(queryConditional)
                .scanIndexForward(true)  // Ascending by addedAt
                .limit(limit)
        }.flatMap { it.items() }
            .take(limit)
            .toList()
    }
}

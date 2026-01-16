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
     * Query books with combined filters.
     * Uses the most selective GSI, then filters remaining criteria in memory.
     */
    fun queryBooks(
        author: String? = null,
        narrator: String? = null,
        genre: String? = null,
        popularity: String? = null,  // "popular" or "niche"
        length: String? = null,       // "Short", "Medium", "Long", "Epic"
        source: String? = null,       // "AUDIBLE" or "ROYAL_ROAD"
        limit: Int = 50
    ): List<Book> {
        // Fetch more than limit to allow for in-memory filtering
        val fetchLimit = limit * 3

        // Query using the most selective GSI (author/narrator/genre/length are more selective than popularity)
        val baseResults = when {
            author != null -> getBooksByAuthor(author, fetchLimit)
            narrator != null -> getBooksByNarrator(narrator, fetchLimit)
            genre != null -> getBooksByGenre(genre, fetchLimit)
            length != null -> getBooksByLength(length, fetchLimit)
            popularity != null -> {
                val isPopular = popularity.equals("popular", ignoreCase = true)
                getBooksByPopularity(isPopular, fetchLimit)
            }
            else -> getBooks().take(fetchLimit)
        }

        // Apply remaining filters in memory
        var filtered = baseResults.asSequence()

        val primaryQueryUsed = author != null || narrator != null
        if (primaryQueryUsed && genre == null && length == null && popularity == null) {
            // Author/narrator was the primary query, no additional filtering needed
        } else {
            if (author != null) filtered = filtered.filter { it.author == author }
            if (narrator != null) filtered = filtered.filter { it.narrator == narrator }
            if (genre != null) filtered = filtered.filter { it.genre == genre }
            if (length != null) filtered = filtered.filter { it.lengthCategory == length }
        }

        // Apply source filter (always, since no GSI for source yet)
        if (source != null) {
            filtered = filtered.filter { it.source.equals(source, ignoreCase = true) }
        }

        // Apply popularity sorting if specified (and wasn't the primary query)
        val result = if (popularity != null && author == null && narrator == null && genre == null && length == null) {
            // Popularity was primary query, already sorted
            filtered.toList()
        } else if (popularity != null) {
            // Re-sort by popularity
            val isPopular = popularity.equals("popular", ignoreCase = true)
            if (isPopular) {
                filtered.sortedByDescending { it.numRatings }.toList()
            } else {
                filtered.sortedBy { it.numRatings }.toList()
            }
        } else {
            filtered.toList()
        }

        return result.take(limit)
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
     * Query books by genre using GSI, sorted by numRatings descending
     */
    fun getBooksByGenre(genre: String, limit: Int = 20): List<Book> {
        val index = bookTable.index("genre-index")
        val queryConditional = QueryConditional.keyEqualTo(
            Key.builder().partitionValue(genre).build()
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

    /**
     * Query books by narrator using GSI, sorted by rating descending
     */
    fun getBooksByNarrator(narrator: String, limit: Int = 20): List<Book> {
        val index = bookTable.index("narrator-index")
        val queryConditional = QueryConditional.keyEqualTo(
            Key.builder().partitionValue(narrator).build()
        )
        return index.query { r ->
            r.queryConditional(queryConditional)
                .scanIndexForward(false)  // Descending by rating
                .limit(limit)
        }.flatMap { it.items() }.toList()
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

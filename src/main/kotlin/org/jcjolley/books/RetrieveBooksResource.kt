package org.jcjolley.books

import jakarta.ws.rs.DefaultValue
import jakarta.ws.rs.GET
import jakarta.ws.rs.Path
import jakarta.ws.rs.Produces
import jakarta.ws.rs.QueryParam
import jakarta.ws.rs.core.MediaType

@Path("/books")
class RetrieveBooksResource(val booksService: BooksService) {

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    fun getBooks(
        @QueryParam("author") author: String?,
        @QueryParam("narrator") narrator: String?,
        @QueryParam("genre") genre: String?,
        @QueryParam("popularity") popularity: String?,  // "popular" or "niche"
        @QueryParam("length") length: String?,          // "Short", "Medium", "Long", "Epic"
        @QueryParam("source") source: String?,          // "AUDIBLE" or "ROYAL_ROAD"
        @QueryParam("limit") @DefaultValue("50") limit: Int,
        @QueryParam("since") since: Long?              // Timestamp in millis - returns only books added after this time
    ): List<Book> {
        // If since is provided, use incremental fetch (ignores other filters)
        if (since != null) {
            return booksService.getBooksAddedSince(since)
        }

        // Use combined query - supports multiple filters
        return booksService.queryBooks(
            author = author,
            narrator = narrator,
            genre = genre,
            popularity = popularity,
            length = length,
            source = source,
            limit = limit
        )
    }

    @GET
    @Path("/authors")
    @Produces(MediaType.APPLICATION_JSON)
    fun getAuthors(
        @QueryParam("search") search: String?,
        @QueryParam("limit") @DefaultValue("20") limit: Int
    ): List<String> {
        return booksService.getDistinctAuthors(search, limit)
    }

    @GET
    @Path("/narrators")
    @Produces(MediaType.APPLICATION_JSON)
    fun getNarrators(
        @QueryParam("search") search: String?,
        @QueryParam("limit") @DefaultValue("20") limit: Int
    ): List<String> {
        return booksService.getDistinctNarrators(search, limit)
    }
}

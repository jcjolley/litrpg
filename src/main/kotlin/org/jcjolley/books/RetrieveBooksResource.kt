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
        @QueryParam("genre") genre: String?,
        @QueryParam("popularity") popularity: String?,  // "popular" or "niche"
        @QueryParam("length") length: String?,          // "Short", "Medium", "Long", "Epic"
        @QueryParam("limit") @DefaultValue("50") limit: Int
    ): List<Book> {
        // Use combined query - supports multiple filters
        return booksService.queryBooks(
            author = author,
            genre = genre,
            popularity = popularity,
            length = length,
            limit = limit
        )
    }
}

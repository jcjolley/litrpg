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
        @QueryParam("subgenre") subgenre: String?,
        @QueryParam("popularity") popularity: String?,  // "popular" or "niche"
        @QueryParam("length") length: String?,          // "Short", "Medium", "Long", "Epic"
        @QueryParam("limit") @DefaultValue("50") limit: Int
    ): List<Book> {
        // Use first non-null filter parameter, with priority order
        return when {
            author != null -> booksService.getBooksByAuthor(author, limit)
            subgenre != null -> booksService.getBooksBySubgenre(subgenre, limit)
            popularity != null -> {
                val isPopular = popularity.equals("popular", ignoreCase = true)
                booksService.getBooksByPopularity(isPopular, limit)
            }
            length != null -> booksService.getBooksByLength(length, limit)
            else -> booksService.getBooks().take(limit)  // Fallback to full scan with limit
        }
    }
}

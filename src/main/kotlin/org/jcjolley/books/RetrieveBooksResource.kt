package org.jcjolley.books

import jakarta.ws.rs.GET
import jakarta.ws.rs.Path
import jakarta.ws.rs.Produces
import jakarta.ws.rs.core.MediaType

@Path("/books")
class RetrieveBooksResource (val booksService: BooksService){

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    fun getBooks() = booksService.getBooks()
}
package org.jcjolley.books

import jakarta.ws.rs.POST
import jakarta.ws.rs.Path
import jakarta.ws.rs.PathParam
import jakarta.ws.rs.core.Response

@Path("/books/{id}")
class BookMetricsResource(private val booksService: BooksService) {

    @POST
    @Path("/impression")
    fun recordImpression(@PathParam("id") id: String): Response {
        return if (booksService.incrementImpression(id)) {
            Response.noContent().build()
        } else {
            Response.status(Response.Status.NOT_FOUND).build()
        }
    }

    @POST
    @Path("/wishlist")
    fun recordWishlist(@PathParam("id") id: String): Response {
        return if (booksService.incrementWishlist(id)) {
            Response.noContent().build()
        } else {
            Response.status(Response.Status.NOT_FOUND).build()
        }
    }

    @POST
    @Path("/click")
    fun recordClick(@PathParam("id") id: String): Response {
        return if (booksService.incrementClickThrough(id)) {
            Response.noContent().build()
        } else {
            Response.status(Response.Status.NOT_FOUND).build()
        }
    }

    @POST
    @Path("/not-interested")
    fun recordNotInterested(@PathParam("id") id: String): Response {
        return if (booksService.incrementNotInterested(id)) {
            Response.noContent().build()
        } else {
            Response.status(Response.Status.NOT_FOUND).build()
        }
    }

    @POST
    @Path("/upvote")
    fun recordUpvote(@PathParam("id") id: String): Response {
        return if (booksService.incrementUpvote(id)) {
            Response.noContent().build()
        } else {
            Response.status(Response.Status.NOT_FOUND).build()
        }
    }

    @POST
    @Path("/downvote")
    fun recordDownvote(@PathParam("id") id: String): Response {
        return if (booksService.incrementDownvote(id)) {
            Response.noContent().build()
        } else {
            Response.status(Response.Status.NOT_FOUND).build()
        }
    }
}

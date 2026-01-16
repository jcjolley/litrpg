package org.jcjolley.books

import jakarta.ws.rs.GET
import jakarta.ws.rs.POST
import jakarta.ws.rs.Path
import jakarta.ws.rs.PathParam
import jakarta.ws.rs.Produces
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response

@Path("/announcements")
@Produces(MediaType.APPLICATION_JSON)
class AnnouncementResource(private val announcementService: AnnouncementService) {

    @GET
    fun list(): List<Announcement> {
        return announcementService.getAnnouncements()
    }

    @POST
    @Path("/{id}/upvote")
    fun upvote(@PathParam("id") id: String): Response {
        return if (announcementService.incrementUpvote(id)) {
            Response.noContent().build()
        } else {
            Response.status(Response.Status.NOT_FOUND).build()
        }
    }

    @POST
    @Path("/{id}/downvote")
    fun downvote(@PathParam("id") id: String): Response {
        return if (announcementService.incrementDownvote(id)) {
            Response.noContent().build()
        } else {
            Response.status(Response.Status.NOT_FOUND).build()
        }
    }
}

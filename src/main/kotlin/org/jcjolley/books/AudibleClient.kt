package org.jcjolley.books

import jakarta.ws.rs.GET
import jakarta.ws.rs.Path
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient
import org.jboss.resteasy.reactive.RestQuery

@Path("/tag/theme/LitRPG-Audiobooks/adbl_rec_tag_0-13-1003")
@RegisterRestClient(configKey="audible")
interface AudbileClient {

    @GET
    fun getLitRpgBooks(@RestQuery page: Int): String
}
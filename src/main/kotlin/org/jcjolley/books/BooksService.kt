package org.jcjolley.books

import it.skrape.core.htmlDocument
import it.skrape.selects.and
import it.skrape.selects.html5.li
import it.skrape.selects.html5.source
import it.skrape.selects.html5.ul
import jakarta.enterprise.context.ApplicationScoped
import org.eclipse.microprofile.rest.client.inject.RestClient
import java.io.File

@ApplicationScoped
class BooksService(
    @RestClient val audible: AudbileClient
) {
    fun getBooks(): List<Book> {
        val contents = File("C:\\Users\\jolle\\IdeaProjects\\litrpg\\src\\main\\resources\\test-books.html")?.bufferedReader()?.readLines() ?: emptyList()
        val html = contents.joinToString("\n")
        return htmlDocument<List<Book>>(html) {
            buildList {
                findFirst {
                    ul {
                        withClass = "bc-list" and "bc-list-nostyle"
                        findAll {
                            li {
                                withClass = "bc-list-item" and "productListItem"
                                forEach {
                                    val imageUrl = findFirst {
                                        source {
                                            withAttribute = "type" to "image/webp"
                                            findFirst { attribute("srcset").split("""\s+""".toRegex()).first() }
                                        }
                                    }
                                    add(
                                        Book(
                                            imageUrl = imageUrl
                                        )
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
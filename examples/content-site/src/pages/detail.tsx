export interface Post {
  slug: string
  title: string
  body: string
}

export function DetailPage({ post }: { post: Post }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>{post.title}</title>
      </head>
      <body>
        <main>
          <a href="/">Back</a>
          <article>
            <h1>{post.title}</h1>
            <p>{post.body}</p>
          </article>
        </main>
      </body>
    </html>
  )
}

export function ContentHomePage({ posts }: { posts: Array<{ slug: string; title: string }> }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>PageMint Content Site</title>
      </head>
      <body>
        <main>
          <h1>Content Site</h1>
          <ul>
            {posts.map((post) => (
              <li>
                <a href={`/posts/${post.slug}`}>{post.title}</a>
              </li>
            ))}
          </ul>
        </main>
      </body>
    </html>
  )
}

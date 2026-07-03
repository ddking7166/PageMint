export function CategoryPage({ category }: { category: string }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>{category}</title>
      </head>
      <body>
        <main>
          <h1>{category}</h1>
          <p>Category route rendered by PageMint.</p>
        </main>
      </body>
    </html>
  )
}

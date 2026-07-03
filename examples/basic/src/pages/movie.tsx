import { Button } from '../components/Button.js'
import { Layout } from '../components/Layout.js'

export interface Movie {
  id: string
  title: string
  year: number
  summary: string
}

export interface MoviePageProps {
  movie: Movie
}

export function MovieDetailPage({ movie }: MoviePageProps) {
  return (
    <Layout title={movie.title}>
      <main>
        <nav class="site-nav" aria-label="主导航">
          <a class="brand" href="/">
            PageMint
          </a>
          <div class="nav-links">
            <a href="/">首页</a>
            <a href="/movies/42">动态路由示例</a>
          </div>
        </nav>
        <article class="section">
          <p class="eyebrow">动态路由示例 #{movie.id}</p>
          <h1>{movie.title}</h1>
          <div class="card">
            <p>{movie.summary}</p>
            <p>
              缓存键：<code>page:movie:{movie.id}</code>
            </p>
            <Button action="movie.favorite" payload={{ id: movie.id, title: movie.title }}>
              收藏示例
            </Button>
          </div>
        </article>
      </main>
    </Layout>
  )
}

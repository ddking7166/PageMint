export interface DependencyEdge {
  source: string
  target: string
}

export class DependencyGraph {
  private readonly edges = new Map<string, Set<string>>()

  add(source: string, target: string): void {
    const from = normalizeDependencyId(source)
    const to = normalizeDependencyId(target)
    if (!from || !to || from === to) {
      return
    }

    let targets = this.edges.get(from)
    if (!targets) {
      targets = new Set()
      this.edges.set(from, targets)
    }
    targets.add(to)
  }

  addMany(edges: DependencyEdge[]): void {
    for (const edge of edges) {
      this.add(edge.source, edge.target)
    }
  }

  remove(source: string, target?: string): void {
    const from = normalizeDependencyId(source)
    if (!target) {
      this.edges.delete(from)
      return
    }

    const targets = this.edges.get(from)
    targets?.delete(normalizeDependencyId(target))
    if (targets?.size === 0) {
      this.edges.delete(from)
    }
  }

  resolve(source: string): string[] {
    const start = normalizeDependencyId(source)
    if (!start) {
      return []
    }

    const visited = new Set<string>()
    const queue = [start]

    for (const current of queue) {
      if (visited.has(current)) {
        continue
      }
      visited.add(current)

      for (const next of this.edges.get(current) ?? []) {
        if (!visited.has(next)) {
          queue.push(next)
        }
      }
    }

    return Array.from(visited).sort()
  }

  list(): DependencyEdge[] {
    const edges: DependencyEdge[] = []

    for (const [source, targets] of this.edges) {
      for (const target of targets) {
        edges.push({ source, target })
      }
    }

    return edges.sort((left, right) => {
      const sourceOrder = left.source.localeCompare(right.source)
      return sourceOrder || left.target.localeCompare(right.target)
    })
  }
}

export function normalizeDependencyId(id: string): string {
  return id.trim()
}

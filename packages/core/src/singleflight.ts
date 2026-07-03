export class SingleFlight {
  private readonly flights = new Map<string, Promise<unknown>>()

  do<T>(key: string, builder: () => Promise<T> | T): Promise<T> {
    const existing = this.flights.get(key)
    if (existing) {
      return existing as Promise<T>
    }

    const promise = Promise.resolve()
      .then(builder)
      .finally(() => {
        this.flights.delete(key)
      })

    this.flights.set(key, promise)
    return promise
  }

  has(key: string): boolean {
    return this.flights.has(key)
  }

  size(): number {
    return this.flights.size
  }
}

const defaultSingleFlight = new SingleFlight()

export function singleFlight<T>(key: string, builder: () => Promise<T> | T): Promise<T> {
  return defaultSingleFlight.do(key, builder)
}

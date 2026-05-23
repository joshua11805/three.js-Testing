let nextId = 1
const entities = new Map() // Map<id, Map<name, data>>
const cleanups = new Map() // Map<id, Map<name, fn>>

export function createEntity() {
  const id = nextId++
  entities.set(id, new Map())
  return id
}

export function destroyEntity(id) {
  const fns = cleanups.get(id)
  if (fns) {
    for (const fn of fns.values()) fn()
    cleanups.delete(id)
  }
  entities.delete(id)
}

// dispose is an optional cleanup function called when the entity is destroyed.
export function addComponent(id, name, data, dispose = null) {
  entities.get(id)?.set(name, data)
  if (dispose) {
    if (!cleanups.has(id)) cleanups.set(id, new Map())
    cleanups.get(id).set(name, dispose)
  }
}

export function removeComponent(id, name) {
  cleanups.get(id)?.get(name)?.()
  cleanups.get(id)?.delete(name)
  entities.get(id)?.delete(name)
}

export function getComponent(id, name) {
  return entities.get(id)?.get(name) ?? null
}

export function hasComponent(id, ...names) {
  const comps = entities.get(id)
  return comps ? names.every(n => comps.has(n)) : false
}

// Returns array of { id, ...requestedComponents } for every entity that has ALL named components.
export function query(...names) {
  const results = []
  for (const [id, comps] of entities) {
    if (names.every(n => comps.has(n))) {
      const entry = { id }
      for (const n of names) entry[n] = comps.get(n)
      results.push(entry)
    }
  }
  return results
}

// Convenience: first matching entity or null.
export function queryFirst(...names) {
  for (const [id, comps] of entities) {
    if (names.every(n => comps.has(n))) {
      const entry = { id }
      for (const n of names) entry[n] = comps.get(n)
      return entry
    }
  }
  return null
}

export function reset() {
  for (const id of entities.keys()) destroyEntity(id)
  nextId = 1
}

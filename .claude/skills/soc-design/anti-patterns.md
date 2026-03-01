# Separation of Concerns Anti-Patterns

Use this reference to identify violations during design review and code review.

---

## UI Layer Anti-Patterns

### AP-UI-1: Calculations in Components

**Violation:**
```typescript
// WRONG: Component calculates business metrics
const PositionCard = ({ position, priceHistory }) => {
  const avgCost = position.trades.reduce((sum, t) => sum + t.price, 0) / position.trades.length
  const pnl = calculatePositionPnL(position, priceMap)
  const costBasis = position.trades.reduce((sum, t) =>
    t.trade_type === 'buy' ? sum + (t.price * t.quantity) : sum, 0)

  return <div>{avgCost} {pnl} {costBasis}</div>
}
```

**Correct:**
```typescript
// RIGHT: Component receives calculated values as props
const PositionCard = ({ position, avgCost, pnl, costBasis }) => {
  return <div>{avgCost} {pnl} {costBasis}</div>
}

// Parent calculates using domain layer
const avgCost = CostBasisCalculator.calculateAverageCost(position.trades, position.target_entry_price)
```

**Detection:** Look for `.reduce()`, `.map()`, `.filter()` with business logic in component files.

---

### AP-UI-2: Direct Service Instantiation

**Violation:**
```typescript
// WRONG: Component creates services directly
const PositionDetail = () => {
  const [db, setDb] = useState<IDBDatabase | null>(null)

  useEffect(() => {
    const request = indexedDB.open('TradingJournalDB', 3)
    request.onsuccess = () => setDb(request.result)
  }, [])

  const positionService = db ? new PositionService(db) : null
}
```

**Correct:**
```typescript
// RIGHT: Component uses Context for services
const PositionDetail = () => {
  const services = useServices()  // From ServiceContext
  const positionService = services.getPositionService()
}
```

**Detection:** Look for `new ServiceName()` or `indexedDB.open()` in component/page files.

---

### AP-UI-3: Validation Logic in Components

**Violation:**
```typescript
// WRONG: Component validates data
const TradeForm = ({ onSubmit }) => {
  const handleSubmit = () => {
    if (quantity <= 0) {
      setError('Quantity must be positive')
      return
    }
    if (price < 0) {
      setError('Price must be non-negative')
      return
    }
    // more validation...
  }
}
```

**Correct:**
```typescript
// RIGHT: Component delegates to validator
const TradeForm = ({ onSubmit }) => {
  const handleSubmit = () => {
    try {
      TradeValidator.validateTrade(tradeData)
      onSubmit(tradeData)
    } catch (error) {
      setError(error.message)
    }
  }
}
```

**Detection:** Look for validation `if` statements in event handlers.

---

## Business Logic Layer Anti-Patterns

### AP-BL-1: Side Effects in Validators

**Violation:**
```typescript
// WRONG: Validator modifies state or calls external services
class TradeValidator {
  static validateTrade(trade: Trade): void {
    if (!trade.position_id) {
      logError('Missing position ID')  // Side effect!
      notifyAdmin('Invalid trade')      // Side effect!
      throw new Error('Missing position_id')
    }
  }
}
```

**Correct:**
```typescript
// RIGHT: Validator is pure - only validates and throws
class TradeValidator {
  static validateTrade(trade: Trade): void {
    if (!trade.position_id) {
      throw new Error('Trade validation failed: Missing position_id')
    }
  }
}
```

**Detection:** Look for logging, API calls, or state modifications in validator files.

---

### AP-BL-2: Non-Deterministic Calculators

**Violation:**
```typescript
// WRONG: Calculator depends on external state
class PnLCalculator {
  static calculatePnL(position: Position): number {
    const currentPrice = await fetchCurrentPrice(position.symbol)  // External!
    return (currentPrice - position.avgCost) * position.quantity
  }
}
```

**Correct:**
```typescript
// RIGHT: Calculator receives all inputs, returns deterministic output
class PnLCalculator {
  static calculatePnL(position: Position, currentPrice: number): number {
    return (currentPrice - position.avgCost) * position.quantity
  }
}
```

**Detection:** Look for `fetch`, `await`, or external data access in calculator files.

---

### AP-BL-3: Database Access in Domain Layer

**Violation:**
```typescript
// WRONG: Calculator accesses database
class PositionStatusCalculator {
  static async computeStatus(positionId: string): Promise<string> {
    const db = await openDatabase()  // Data access!
    const position = await getPosition(db, positionId)
    return position.trades.length === 0 ? 'planned' : 'open'
  }
}
```

**Correct:**
```typescript
// RIGHT: Calculator receives data, computes result
class PositionStatusCalculator {
  static computeStatus(trades: Trade[]): 'planned' | 'open' | 'closed' {
    if (!trades || trades.length === 0) return 'planned'
    const openQuantity = CostBasisCalculator.calculateOpenQuantity(trades)
    return openQuantity === 0 ? 'closed' : 'open'
  }
}
```

**Detection:** Look for `IDBDatabase`, `indexedDB`, or async database operations in domain files.

---

## Data Layer Anti-Patterns

### AP-DL-1: Duplicate Database Connection Code

**Violation:**
```typescript
// WRONG: Each service manages its own connection
class PositionService {
  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TradingJournalDB', 3)
      request.onupgradeneeded = (event) => {
        // Schema initialization duplicated here!
      }
      request.onsuccess = () => resolve(request.result)
    })
  }
}

class PriceService {
  private async getDB(): Promise<IDBDatabase> {
    // Same 40 lines duplicated!
  }
}
```

**Correct:**
```typescript
// RIGHT: Service accepts database via constructor
class PositionService {
  private db: IDBDatabase

  constructor(db: IDBDatabase) {
    this.db = db
  }
}

// ServiceContainer manages the single connection
class ServiceContainer {
  async initialize(): Promise<void> {
    this.db = await this.openDatabase()
  }

  getPositionService(): PositionService {
    return new PositionService(this.getDatabase())
  }
}
```

**Detection:** Look for `getDB()` methods or `indexedDB.open()` in service files.

---

### AP-DL-2: Schema Scattered Across Services

**Violation:**
```typescript
// WRONG: Each service defines its own schema
class PositionService {
  private initSchema(db: IDBDatabase) {
    if (!db.objectStoreNames.contains('positions')) {
      const store = db.createObjectStore('positions', { keyPath: 'id' })
      store.createIndex('symbol', 'symbol')
    }
  }
}

class JournalService {
  private initSchema(db: IDBDatabase) {
    if (!db.objectStoreNames.contains('journal_entries')) {
      // Different schema logic here
    }
  }
}
```

**Correct:**
```typescript
// RIGHT: SchemaManager is single source of truth
class SchemaManager {
  static initializeSchema(db: IDBDatabase, version: number): void {
    // ALL schema definitions in one place
    if (!db.objectStoreNames.contains('positions')) { ... }
    if (!db.objectStoreNames.contains('journal_entries')) { ... }
    if (!db.objectStoreNames.contains('price_history')) { ... }
  }
}
```

**Detection:** Look for `createObjectStore` or `createIndex` calls outside SchemaManager.

---

### AP-DL-3: Inconsistent Service Method Naming

**Violation:**
```typescript
// WRONG: Inconsistent naming across services
class PositionService {
  findById(id: string): Promise<Position>      // find
  fetchAll(): Promise<Position[]>               // fetch
}

class JournalService {
  getById(id: string): Promise<JournalEntry>   // get
  getAll(): Promise<JournalEntry[]>            // get
  findById(id: string): Promise<JournalEntry>  // DUPLICATE method!
}
```

**Correct:**
```typescript
// RIGHT: Consistent naming pattern
class PositionService {
  getById(id: string): Promise<Position | null>
  getAll(): Promise<Position[]>
  create(entity: Position): Promise<Position>
  update(entity: Position): Promise<Position>
  delete(id: string): Promise<void>
}
```

**Detection:** Look for mixed naming (`find`, `fetch`, `get`, `retrieve`) across services.

---

## Cross-Layer Anti-Patterns

### AP-XL-1: Magic Numbers

**Violation:**
```typescript
// WRONG: Magic numbers scattered in code
// In PriceValidator.ts
if (percentChange > 20) { ... }

// In planVsExecution.ts
const tolerance = 0.01

// In formatters.ts
return amount.toFixed(2)
```

**Correct:**
```typescript
// RIGHT: Constants in config file
// src/config/constants.ts
export const PRICE_CHANGE_THRESHOLD_PERCENT = 20
export const PLAN_VS_EXECUTION_TOLERANCE = 0.01
export const DECIMAL_PRECISION = 2

// Usage
import { PRICE_CHANGE_THRESHOLD_PERCENT } from '@/config/constants'
if (percentChange > PRICE_CHANGE_THRESHOLD_PERCENT) { ... }
```

**Detection:** Look for numeric literals in business logic.

---

### AP-XL-2: Circular Dependencies

**Violation:**
```typescript
// WRONG: UI imports service, service imports UI component
// PositionCard.tsx
import { PositionService } from '@/services/PositionService'

// PositionService.ts
import { formatPosition } from '@/components/PositionCard'  // Circular!
```

**Correct:**
```typescript
// RIGHT: Dependencies flow one direction
// UI → Services → Domain
// UI → Utils (for formatting)
// Services → Domain (for validation/calculation)
```

**Detection:** Look for imports going "up" the layer stack.

---

### AP-XL-3: Duplicate Utility Functions

**Violation:**
```typescript
// WRONG: Same function in multiple files
// PositionCard.tsx
const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', {...}).format(date)

// PositionDetail.tsx
const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', {...}).format(date)

// JournalCarousel.tsx
const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat('en-US', {...}).format(new Date(dateString))
```

**Correct:**
```typescript
// RIGHT: Single utility function
// src/utils/formatters.ts
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {...}).format(date)
}

// All components import from utility
import { formatDate } from '@/utils/formatters'
```

**Detection:** Search for duplicate function signatures across files.

---

## Quick Reference Checklist

When reviewing code, check for these patterns:

| Layer | Anti-Pattern | Detection Method |
|-------|--------------|------------------|
| UI | Calculations | `.reduce()`, `.map()` with logic |
| UI | Service instantiation | `new ServiceName()` |
| UI | Validation | `if` chains checking data |
| Domain | Side effects | `console`, `fetch`, `log` |
| Domain | Async operations | `async`, `await`, `Promise` |
| Domain | Database access | `IDBDatabase`, `indexedDB` |
| Data | Duplicate getDB | Multiple `getDB()` methods |
| Data | Scattered schema | `createObjectStore` outside SchemaManager |
| Data | Naming inconsistency | Mixed `find`/`fetch`/`get` |
| Cross | Magic numbers | Numeric literals in logic |
| Cross | Circular deps | "Upward" imports |
| Cross | Duplicate code | Same function in multiple files |

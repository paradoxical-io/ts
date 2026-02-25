# CLAUDE.md

## Architecture

- Modular monolith: enforce strict module boundaries. Services interact through public APIs only — never reach into another module's internals.
- No circular dependencies between modules. If A depends on B, B must not depend on A. Use eventing/queues to decouple when bidirectional communication is needed.
- Never leak third-party IDs (Stripe, banking cores, partner systems) into the domain. Create internal IDs that map to external ones — this makes partner migration a config change, not a rewrite.
- Abstract frameworks (HTTP, ORM, queue) behind interfaces. Always leave an escape hatch (e.g. raw SQL) for when the abstraction limits performance.
- Wrap third-party clients (AWS SDK, Stripe, etc.) in service classes with better developer ergonomics. This gives a single place to add logging, metrics, retries, and error normalization instead of scattering SDK calls throughout the codebase.
- Time is a dependency. Never call `Date.now()` or `new Date()` directly — inject a `TimeProvider` so tests can travel forward and backward deterministically.
- Soft deletes only (`deleted_at` timestamp). Hard deletes are forbidden on domain entities.
- Build artifacts once. The same image/bundle moves Dev → Stage → Prod. Configuration is injected at runtime (env vars), never baked in at build time.
- Identify one-way doors (database schema, public API contracts, IaC deletions) and deliberate. Move fast on everything else.

## Observability

- Generate a Trace ID at ingress and propagate it through every function call, async queue message, and third-party request.
- Structured JSON logs only. Use contextual loggers: `log.with({ userId, traceId }).info("Action")`.
- Auto-redact PII and secrets via middleware — never rely on developers remembering to omit sensitive fields.
- Avoid high-cardinality metric tags (user IDs, request IDs) to prevent billing explosions in metrics backends.

## Debugging

- Always root-cause an issue. Do not take shortcuts, suppress errors, or work around symptoms.
- If the root cause looks complex or touches multiple systems, surface a plan before making changes.

## TypeScript

- After any TypeScript change, run the linter. Do not consider the change done until it passes.
- Never use synchronous I/O (`readFileSync`, `writeFileSync`, `execSync`, etc.). Always use the async equivalents (`readFile`, `writeFile`, `execFile`, etc.).
- Always use branded types from `@taxbit-private/type-wrappers` (e.g. `StringType`) instead of bare primitives. A function that accepts `string` where it means `AccountId` is a bug waiting to happen.
- Prefer immutable data. Use `readonly`, `Readonly<T>`, and `as const`. Mutate only when performance demands it and the scope is small.
- Prefer a functional style — pure functions, composition, and expressions over statements. Avoid side effects outside of explicit boundaries (constructors, handlers).
- Use classes instead of loose top-level functions. Group related behavior behind a class with a clear single responsibility.
- Accept dependencies in the constructor via IoC. Use `@Inject` when working within the NestJS DI workflow.
- No global variables or module-level mutable state. Configuration must be explicit and passed as structured objects, never read from `process.env` inline. The top-level caller (main, CLI entry point, test harness) parses environment into a typed config object and passes it down.
- Use descriptive variable names. Characters are free — prefer clarity over brevity. Avoid single-letter variables except in trivial arrow functions. When an expression is deeply nested, capture intermediate values into named `const`s.
- Functions must have at most 3 positional parameters. Beyond that, use a single options object: `doThing({ catalog, schema, dryRun })`.
- Keep functions small and composable. If a function does two things, split it into two functions. Never name a function `fooAndBar()` — that is two functions. Each function has one job.

## Testing

- Test hierarchy: unit tests for logic, integration tests with real dependencies (Dockerized/LocalStack).
- Tests must own their state. Each test sets up exactly what it needs — avoid broad `beforeEach` blocks that create shared mutable fixtures.
- Optimize for readability. A reader should scan a test and instantly see what is being tested. Extract utility functions and base classes that hide boilerplate (file resolvers, fake builders, assertion helpers) so test methods contain only the signal: input, action, expected outcome.
- Reuse test infrastructure. When multiple test classes share the same setup pattern (fake resolvers, builders, content scanners), extract a shared helper or base class. Duplicated test scaffolding is just as bad as duplicated production code.
- Never test against production. Never connect local dev environments to production services.

## Developer Experience

- Guiding principle: simplicity and correctness. The easy thing should be the right thing. A developer should rarely be able to do the wrong thing — as platform developers, build the guardrails that enforce correctness.
- Let tools and guardrails enforce correct behavior so developers don't have to guess. Type checkers, linters, generated code, frozen classes, and validation at build time all beat documentation that says "please remember to."
- When adding a new capability, ask: can a developer use this correctly without reading a README? If not, simplify the API or add compile-time/test-time enforcement.
- Prefer failing fast and loudly over silent misbehavior. A clear error at `generate` or `tofu plan` time is worth more than a subtle bug in production.
- If you do it twice, script it. Centralize developer tasks in repo-scoped CLI tooling.
- A feature is not done until it has metrics, alerts, and support tooling. Code that runs but can't be observed or operated is incomplete.

### Enforcing invariants

Every invariant should be enforced automatically. Use the strongest mechanism available, in this priority order:

1. **Type system** — Make illegal states unrepresentable. Branded types, enums, frozen dataclasses, and `Literal` types catch errors at compile time with zero runtime cost.
2. **Tests** — When the type system can't express a constraint, write a test that fails if the invariant is violated. Schema drift tests, round-trip serialization checks, and contract tests belong here.
3. **Code generation validators** — When an invariant spans config and code (e.g. "Lakebase source tables must have CDC enabled"), add validation to `just generate` so it fails before anything is deployed. This is the right layer for cross-cutting checks that can't live in a single type signature.
4. **CI checks** — Lint rules, generated-code-up-to-date checks, and PR scope validation catch what slips past local tooling.
5. **Runtime validation** — `@enforce` decorators, DLT expectations, and input validation at system boundaries. Use these as a last line of defense, not the primary mechanism.

When introducing a new convention or constraint, don't document it and hope people follow it. Instead, ask: "How do I make it impossible (or at least loud and obvious) to violate this?" Build the check, wire it into the developer workflow, and then document why it exists.

## Configuration

- Keep YAML and configuration to a minimum. Prefer code over config when logic is involved.
- Reuse and componentize shared definitions (schemas, table lists, environment settings) rather than duplicating them across files.
- Minimize cognitive complexity — a reader should understand what a config does without cross-referencing multiple files.

## Documentation

After adding a new feature, CLI tool, pipeline abstraction, or Terraform resource, update the relevant README or doc. Documentation is not done until the change is reflected.

### Doc hierarchy (progressive disclosure)

Documentation follows progressive disclosure — the top level is the simplest, each layer adds detail:

1. **`README.md`** (root) — Quickstart only. Minimal cognitive load: install, run, and links to everything else. No deep explanations.
2. **`docs/*.md`** — Guides and operational docs. Development setup, deployment, architecture, debugging workflows.
3. **`databricks/README.md`**, **`terraform/README.md`** — Component-level detail. Bundle conventions, schema enforcement, Kinesis sinks, Lakebase, Terraform modules.

When adding content, put it at the lowest level that makes sense. The root README should link to detail, never contain it. If a section in the root README grows beyond a short paragraph + code snippet, move the detail downstream and replace it with a link.

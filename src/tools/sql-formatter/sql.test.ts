import { formatSqlStatement, minifySqlStatement, maximumSqlLength, sqlDialects } from "./sql"

describe("formatSqlStatement", () => {
  it("indents clauses with two spaces per level", () => {
    expect(
      formatSqlStatement("select id, name from users where active = 1 order by name", "sql"),
    ).toEqual({
      output: "select\n  id,\n  name\nfrom\n  users\nwhere\n  active = 1\norder by\n  name",
      message: "",
    })
  })

  it("keeps string literals and comments intact", () => {
    const result = formatSqlStatement("select 'a,b' from t -- keep this", "sql")
    expect(result.message).toBe("")
    expect(result.output).toContain("'a,b'")
    expect(result.output).toContain("-- keep this")
  })

  it("honors the chosen dialect", () => {
    // Backtick quoting is MySQL-only and would be a parse error in standard SQL.
    expect(formatSqlStatement("select `id` from `users`", "mysql").output).toContain("`id`")
    // Dollar-quoted strings are PostgreSQL-only.
    const dollar = formatSqlStatement("select $$tagged$$ from t", "postgresql")
    expect(dollar.message).toBe("")
    expect(dollar.output).toContain("$$tagged$$")
  })

  it("rejects dialect-inappropriate syntax with a fixed message", () => {
    const result = formatSqlStatement("select 'unterminated from users", "sql")
    expect(result.output).toBe("")
    expect(result.message).toBe("The SQL could not be parsed for formatting.")
    expect(result.message).not.toContain("unterminated")
  })

  it("returns empty output for blank input", () => {
    expect(formatSqlStatement("", "sql")).toEqual({ output: "", message: "" })
    expect(formatSqlStatement("   \n  ", "postgresql")).toEqual({ output: "", message: "" })
  })

  it("enforces the length limit", () => {
    const result = formatSqlStatement("select " + "x".repeat(maximumSqlLength), "sql")
    expect(result.output).toBe("")
    expect(result.message).toContain("limited to 50,000")
  })

  it("exposes the three documented dialects", () => {
    expect([...sqlDialects]).toEqual(["sql", "mysql", "postgresql"])
  })
})

describe("minifySqlStatement", () => {
  it("collapses formatted output onto one line", () => {
    expect(minifySqlStatement("select id, name from users where active = 1", "sql")).toEqual({
      output: "select id, name from users where active=1",
      message: "",
    })
  })

  it("preserves string contents when collapsing whitespace", () => {
    const result = minifySqlStatement("select 'a  b' from t", "sql")
    expect(result.message).toBe("")
    expect(result.output).toContain("'a  b'")
  })

  it("passes failures through unchanged", () => {
    const result = minifySqlStatement("select 'oops", "sql")
    expect(result.output).toBe("")
    expect(result.message).toBe("The SQL could not be parsed for formatting.")
  })
})

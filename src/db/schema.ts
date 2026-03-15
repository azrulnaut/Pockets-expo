// SQLite schema verbatim from sql/schema.sql in azrulnaut/Pockets-project
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS funds (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
    currency     TEXT    NOT NULL DEFAULT 'USD',
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dimensions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT    NOT NULL UNIQUE,
    is_balancing     INTEGER NOT NULL DEFAULT 0 CHECK (is_balancing IN (0, 1)),
    allows_multiple  INTEGER NOT NULL DEFAULT 0 CHECK (allows_multiple IN (0, 1)),
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dimension_values (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    dimension_id INTEGER NOT NULL REFERENCES dimensions(id) ON DELETE RESTRICT,
    label        TEXT    NOT NULL,
    sort_order   INTEGER,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (dimension_id, label)
);

CREATE INDEX IF NOT EXISTS idx_dv_dimension ON dimension_values(dimension_id);

CREATE TABLE IF NOT EXISTS allocation_slices (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    fund_id    INTEGER NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
    amount     INTEGER NOT NULL CHECK (amount >= 0),
    note       TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_slices_fund ON allocation_slices(fund_id);

CREATE TABLE IF NOT EXISTS slice_dimensions (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    slice_id           INTEGER NOT NULL REFERENCES allocation_slices(id) ON DELETE CASCADE,
    dimension_value_id INTEGER NOT NULL REFERENCES dimension_values(id)  ON DELETE RESTRICT,
    UNIQUE (slice_id, dimension_value_id)
);

CREATE INDEX IF NOT EXISTS idx_sd_slice ON slice_dimensions(slice_id);
CREATE INDEX IF NOT EXISTS idx_sd_dv    ON slice_dimensions(dimension_value_id);

INSERT OR IGNORE INTO dimensions (id, name, is_balancing, allows_multiple) VALUES
    (1, 'Accounts', 1, 0),
    (2, 'Purpose',  1, 0),
    (3, 'Notes',    0, 1);

INSERT OR IGNORE INTO funds (id, name, total_amount) VALUES (1, 'Total Amount', 0);

CREATE TABLE IF NOT EXISTS purpose_targets (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    dimension_value_id INTEGER NOT NULL REFERENCES dimension_values(id) ON DELETE CASCADE,
    target_amount      INTEGER NOT NULL DEFAULT 0,
    UNIQUE (dimension_value_id)
);
`;

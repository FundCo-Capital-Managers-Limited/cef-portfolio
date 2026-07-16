/**
 * Minimal in-memory stand-in for @supabase/supabase-js's query builder, covering
 * only the chain shapes actually used by the codebase (select/eq/gte/lte/order/
 * limit + maybeSingle/single/direct-await, insert with optional .select().single(),
 * upsert, update). Not a general Supabase mock — extend it if a service starts
 * using a new shape.
 */
function createFakeSupabase(seed = {}) {
  const store = JSON.parse(JSON.stringify(seed));

  function table(name) {
    store[name] = store[name] || [];
    return store[name];
  }

  function matchesFilter(row, { type, col, val }) {
    if (type === 'eq') return row[col] === val;
    if (type === 'gte') return row[col] >= val;
    if (type === 'lte') return row[col] <= val;
    if (type === 'in') return val.includes(row[col]);
    if (type === 'like') {
      // Only the "prefix%" shape is used in this codebase — good enough for a test double.
      const pattern = new RegExp(`^${val.replace(/%/g, '.*')}$`);
      return typeof row[col] === 'string' && pattern.test(row[col]);
    }
    return true;
  }

  function makeSelectChain(name) {
    const filters = [];
    let orderSpec = null;
    let limitN = null;

    function resolve() {
      let rows = table(name).filter((r) => filters.every((f) => matchesFilter(r, f)));
      if (orderSpec) {
        rows = [...rows].sort((a, b) => {
          if (a[orderSpec.col] === b[orderSpec.col]) return 0;
          const dir = a[orderSpec.col] > b[orderSpec.col] ? 1 : -1;
          return orderSpec.ascending ? dir : -dir;
        });
      }
      if (limitN) rows = rows.slice(0, limitN);
      return rows;
    }

    const chain = {
      eq(col, val) {
        filters.push({ type: 'eq', col, val });
        return chain;
      },
      gte(col, val) {
        filters.push({ type: 'gte', col, val });
        return chain;
      },
      lte(col, val) {
        filters.push({ type: 'lte', col, val });
        return chain;
      },
      in(col, vals) {
        filters.push({ type: 'in', col, val: vals });
        return chain;
      },
      like(col, pattern) {
        filters.push({ type: 'like', col, val: pattern });
        return chain;
      },
      order(col, { ascending } = {}) {
        orderSpec = { col, ascending };
        return chain;
      },
      limit(n) {
        limitN = n;
        return chain;
      },
      async maybeSingle() {
        const rows = resolve();
        return { data: rows[0] || null, error: null };
      },
      async single() {
        const rows = resolve();
        return { data: rows[0] || null, error: null };
      },
      // Allows `await supabase.from(x).select(...).eq(...)` without a terminal
      // maybeSingle()/single() call — resolves to the full matching array.
      then(onResolve) {
        onResolve({ data: resolve(), error: null });
      },
    };

    return chain;
  }

  function makeInsertResult(name, rowOrRows) {
    const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
    const withIds = rows.map((row) => ({ id: row.id || `${name}-${table(name).length + 1}`, ...row }));
    withIds.forEach((row) => table(name).push(row));
    const single = withIds[0];
    return {
      then(resolve) {
        resolve({ error: null });
      },
      select() {
        return {
          async single() {
            return { data: single, error: null };
          },
          then(resolve) {
            resolve({ data: withIds, error: null });
          },
        };
      },
    };
  }

  let authUserSeq = 0;

  return {
    _store: store,
    auth: {
      admin: {
        async createUser({ email }) {
          authUserSeq += 1;
          return { data: { user: { id: `fake-auth-${authUserSeq}`, email } }, error: null };
        },
        async deleteUser() {
          return { data: {}, error: null };
        },
        async updateUserById(authUserId) {
          return { data: { user: { id: authUserId } }, error: null };
        },
        async generateLink({ email }) {
          return {
            data: {
              properties: {
                action_link: `https://fake-recovery-link.example/${encodeURIComponent(email)}`,
                hashed_token: `fake-token-hash-${encodeURIComponent(email)}`,
              },
            },
            error: null,
          };
        },
      },
    },
    from(name) {
      return {
        select() {
          return makeSelectChain(name);
        },
        insert(obj) {
          return makeInsertResult(name, obj);
        },
        async upsert(obj, opts = {}) {
          const keys = (opts.onConflict || 'id').split(',');
          const rows = table(name);
          const idx = rows.findIndex((r) => keys.every((k) => r[k] === obj[k]));
          if (idx >= 0) rows[idx] = { ...rows[idx], ...obj };
          else rows.push({ ...obj });
          return { error: null };
        },
        delete() {
          const filters = [];
          const chain = {
            eq(col, val) {
              filters.push({ type: 'eq', col, val });
              return chain;
            },
            like(col, pattern) {
              filters.push({ type: 'like', col, val: pattern });
              return chain;
            },
            then(resolve) {
              const rows = table(name);
              store[name] = rows.filter((r) => !filters.every((f) => matchesFilter(r, f)));
              resolve({ error: null });
            },
          };
          return chain;
        },
        update(patch) {
          const filters = [];
          function apply() {
            const updatedRows = [];
            table(name).forEach((r) => {
              if (filters.every((f) => matchesFilter(r, f))) {
                Object.assign(r, patch);
                updatedRows.push(r);
              }
            });
            return updatedRows;
          }
          const chain = {
            eq(col, val) {
              filters.push({ type: 'eq', col, val });
              return chain;
            },
            then(resolve) {
              apply();
              resolve({ error: null });
            },
            select() {
              return {
                async single() {
                  const updatedRows = apply();
                  return { data: updatedRows[0] || null, error: null };
                },
                async maybeSingle() {
                  const updatedRows = apply();
                  return { data: updatedRows[0] || null, error: null };
                },
                then(resolve) {
                  const updatedRows = apply();
                  resolve({ data: updatedRows, error: null });
                },
              };
            },
          };
          return chain;
        },
      };
    },
  };
}

module.exports = { createFakeSupabase };

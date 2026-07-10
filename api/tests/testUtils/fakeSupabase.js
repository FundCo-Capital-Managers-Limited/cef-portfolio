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

  function makeSelectChain(name) {
    const filters = [];
    let orderSpec = null;
    let limitN = null;

    function resolve() {
      let rows = table(name).filter((r) =>
        filters.every(({ type, col, val }) => {
          if (type === 'eq') return r[col] === val;
          if (type === 'gte') return r[col] >= val;
          if (type === 'lte') return r[col] <= val;
          if (type === 'in') return val.includes(r[col]);
          return true;
        })
      );
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
        update(patch) {
          return {
            eq(col, val) {
              const updatedRows = [];
              table(name).forEach((r) => {
                if (r[col] === val) {
                  Object.assign(r, patch);
                  updatedRows.push(r);
                }
              });
              return {
                then(resolve) {
                  resolve({ error: null });
                },
                select() {
                  return {
                    async single() {
                      return { data: updatedRows[0] || null, error: null };
                    },
                    then(resolve) {
                      resolve({ data: updatedRows, error: null });
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

module.exports = { createFakeSupabase };

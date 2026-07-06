/**
 * Minimal in-memory stand-in for @supabase/supabase-js's query builder, covering
 * only the chain shapes actually used by the codebase (select/eq/order/limit +
 * maybeSingle/single, insert with optional .select().single(), upsert, update).
 * Not a general Supabase mock — extend it if a service starts using a new shape.
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

    const chain = {
      eq(col, val) {
        filters.push([col, val]);
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
    };

    function resolve() {
      let rows = table(name).filter((r) => filters.every(([c, v]) => r[c] === v));
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

    return chain;
  }

  function makeInsertResult(name, row) {
    const withId = { id: row.id || `${name}-${table(name).length + 1}`, ...row };
    table(name).push(withId);
    return {
      then(resolve) {
        resolve({ error: null });
      },
      select() {
        return {
          async single() {
            return { data: withId, error: null };
          },
        };
      },
    };
  }

  return {
    _store: store,
    from(name) {
      return {
        select() {
          return makeSelectChain(name);
        },
        insert(obj) {
          return makeInsertResult(name, obj);
        },
        async upsert(obj, opts = {}) {
          const key = opts.onConflict || 'id';
          const rows = table(name);
          const idx = rows.findIndex((r) => r[key] === obj[key]);
          if (idx >= 0) rows[idx] = { ...rows[idx], ...obj };
          else rows.push({ ...obj });
          return { error: null };
        },
        update(patch) {
          return {
            async eq(col, val) {
              table(name).forEach((r) => {
                if (r[col] === val) Object.assign(r, patch);
              });
              return { error: null };
            },
          };
        },
      };
    },
  };
}

module.exports = { createFakeSupabase };

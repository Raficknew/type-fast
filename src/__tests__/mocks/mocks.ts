type QueueResult = Record<string, unknown>;

type MockFn = {
  mockReset: () => unknown;
};

type QueryHarnessMocks = {
  selectMock?: (...args: unknown[]) => unknown;
  limitMock?: (...args: unknown[]) => unknown;
  eqMock?: (...args: unknown[]) => unknown;
  singleMock?: (...args: unknown[]) => unknown;
  maybeSingleMock?: (...args: unknown[]) => unknown;
  upsertMock?: (...args: unknown[]) => unknown;
  insertMock?: (...args: unknown[]) => unknown;
  updateMock?: (...args: unknown[]) => unknown;
  deleteMock?: (...args: unknown[]) => unknown;
  orderMock?: (...args: unknown[]) => unknown;
};

export const resetMocks = (...mocks: Array<MockFn>) => {
  for (const mock of mocks) {
    mock.mockReset();
  }
};

export const createSupabaseQueryBuilderHarness = (mocks: QueryHarnessMocks) => {
  const resultsQueue: QueueResult[] = [];

  const createBuilder = () => {
    const builder = {
      select: (...args: unknown[]) => {
        mocks.selectMock?.(...args);
        return builder;
      },
      limit: (...args: unknown[]) => {
        mocks.limitMock?.(...args);
        return builder;
      },
      eq: (...args: unknown[]) => {
        mocks.eqMock?.(...args);
        return builder;
      },
      single: (...args: unknown[]) => {
        mocks.singleMock?.(...args);
        return builder;
      },
      maybeSingle: (...args: unknown[]) => {
        mocks.maybeSingleMock?.(...args);
        return builder;
      },
      upsert: (...args: unknown[]) => {
        mocks.upsertMock?.(...args);
        return builder;
      },
      insert: (...args: unknown[]) => {
        mocks.insertMock?.(...args);
        return builder;
      },
      update: (...args: unknown[]) => {
        mocks.updateMock?.(...args);
        return builder;
      },
      delete: (...args: unknown[]) => {
        mocks.deleteMock?.(...args);
        return builder;
      },
      order: (...args: unknown[]) => {
        mocks.orderMock?.(...args);
        return builder;
      },
      // biome-ignore lint/suspicious/noThenProperty: needed for promise-like query stubs
      then: (resolve: (value: unknown) => void) => {
        resolve(resultsQueue.shift() ?? {});
      },
    };

    return builder;
  };

  const queueSupabaseResults = (...results: QueueResult[]) => {
    resultsQueue.push(...results);
  };

  const reset = () => {
    resultsQueue.length = 0;
  };

  return {
    createBuilder,
    queueSupabaseResults,
    reset,
  };
};

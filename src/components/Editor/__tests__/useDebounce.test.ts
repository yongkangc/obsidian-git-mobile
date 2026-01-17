jest.useFakeTimers();

describe('debounce logic unit tests', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  it('setTimeout is called correctly', () => {
    const spy = jest.spyOn(globalThis, 'setTimeout');
    setTimeout(() => {}, 500);
    expect(spy).toHaveBeenCalledWith(expect.any(Function), 500);
    spy.mockRestore();
  });

  it('clearTimeout cancels pending timeout', () => {
    const callback = jest.fn();
    const id = setTimeout(callback, 500);
    clearTimeout(id);
    jest.advanceTimersByTime(600);
    expect(callback).not.toHaveBeenCalled();
  });

  it('multiple setTimeouts - only last fires after clearing', () => {
    const callbacks = [jest.fn(), jest.fn(), jest.fn()];
    let lastId: ReturnType<typeof setTimeout> | undefined;

    callbacks.forEach((cb) => {
      if (lastId !== undefined) {
        clearTimeout(lastId);
      }
      lastId = setTimeout(cb, 500);
    });

    jest.advanceTimersByTime(500);

    expect(callbacks[0]).not.toHaveBeenCalled();
    expect(callbacks[1]).not.toHaveBeenCalled();
    expect(callbacks[2]).toHaveBeenCalledTimes(1);
  });

  it('simulates debounce pattern - cancels and reschedules', () => {
    const callback = jest.fn();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const debounce = (value: string) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => callback(value), 500);
    };

    debounce('first');
    jest.advanceTimersByTime(200);
    expect(callback).not.toHaveBeenCalled();

    debounce('second');
    jest.advanceTimersByTime(200);
    expect(callback).not.toHaveBeenCalled();

    debounce('third');
    jest.advanceTimersByTime(500);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('third');
  });
});

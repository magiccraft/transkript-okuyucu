namespace TranskriptOkuyucu.Common;

/// <summary>
/// Provides striped locking based on string keys to prevent cache stampedes and race conditions.
/// </summary>
public sealed class KeyedLock : IDisposable
{
    private readonly SemaphoreSlim[] _locks;

    public KeyedLock(int concurrencyLevel = 32)
    {
        _locks = Enumerable.Range(0, concurrencyLevel)
            .Select(_ => new SemaphoreSlim(1, 1))
            .ToArray();
    }

    public async Task<IDisposable> LockAsync(string key, CancellationToken cancellationToken = default)
    {
        var semaphore = GetSemaphore(key);
        await semaphore.WaitAsync(cancellationToken);
        return new Releaser(semaphore);
    }

    private SemaphoreSlim GetSemaphore(string key)
    {
        uint hash = (uint)StringComparer.Ordinal.GetHashCode(key);
        return _locks[hash % (uint)_locks.Length];
    }

    private sealed class Releaser : IDisposable
    {
        private readonly SemaphoreSlim _semaphore;
        private bool _disposed;

        public Releaser(SemaphoreSlim semaphore)
        {
            _semaphore = semaphore;
        }

        public void Dispose()
        {
            if (!_disposed)
            {
                _semaphore.Release();
                _disposed = true;
            }
        }
    }

    public void Dispose()
    {
        foreach (var semaphore in _locks)
        {
            semaphore.Dispose();
        }
    }
}

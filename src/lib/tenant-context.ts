import { AsyncLocalStorage } from 'async_hooks';

const tenantStorage = new AsyncLocalStorage<string>();

export function setTenantContext(tenantId: string, callback: () => any) {
    return tenantStorage.run(tenantId, callback);
}

export function getTenantContext(): string | undefined {
    return tenantStorage.getStore();
}

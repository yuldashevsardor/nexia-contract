export function sleep(time: number, unref = false): Promise<void> {
    return new Promise((resolve) => {
        const method = setTimeout(() => {
            resolve();
        }, time);

        if (unref) {
            method.unref();
        }
    });
}

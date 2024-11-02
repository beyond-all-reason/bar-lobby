/* eslint-disable @typescript-eslint/no-explicit-any */
export class Signal<T = any> {
    public bindings: Array<SignalBinding<T>> = [];

    public add(callback: (data: T) => void): SignalBinding<T> {
        const binding = new SignalBinding<T>(this, callback);
        this.bindings.push(binding);
        return binding;
    }

    public addOnce(callback: (data: T) => void): SignalBinding<T> {
        const binding = new SignalBinding<T>(this, callback, true);
        this.bindings.push(binding);
        return binding;
    }

    public dispatch(data?: T) {
        for (const binding of this.bindings) {
            binding.execute(data as T);
        }
    }

    public dispose(bindingToDispose: SignalBinding) {
        for (const binding of this.bindings) {
            if (bindingToDispose === binding) {
                bindingToDispose.destroy();
            }
        }
    }

    public disposeAll() {
        for (const binding of this.bindings) {
            binding.destroy();
        }

        this.bindings = [];
    }
}

export class SignalBinding<T = any> {
    constructor(protected signal: Signal, protected listener?: (data: T) => void, protected destroyAfterExecute = false) {
        this.signal = signal;
        this.listener = listener;
    }

    public execute(data: T) {
        if (this.listener) {
            this.listener(data);
        }
        if (this.destroyAfterExecute) {
            this.destroy();
        }
    }

    public destroy() {
        const index = this.signal.bindings.indexOf(this);
        if (index !== -1) {
            this.signal.bindings.splice(index, 1);
        }
        delete this.listener;
    }
}

import { AnyAction, Action } from 'redux';

import { call, put } from 'redux-saga/effects';

export interface State {
    [key: string]: unknown;
}

export type Reducer<S extends State = State, A extends Action = AnyAction> = (state: S, action: A) => S;

export type EffectFunction = (
    action: AnyAction,
    effects: {
        call: typeof call;
        put: typeof put;
    },
) => Generator;

export type EFunction = (action: AnyAction) => Generator;

export interface Model<T extends State = State> {
    namespace: string;
    state: T;
    reducer?: Record<string, Reducer<T>>;
    effects?: Record<string, EffectFunction>;
}

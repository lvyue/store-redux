import { createStore, combineReducers, Action, Reducer, Store, applyMiddleware, Middleware, AnyAction } from 'redux';
import { Model, State, EffectFunction } from './types';
import { keys, forEach, values, reduce, map } from 'ramda';
import logger from 'redux-logger';
import createSagaMiddleware, { SagaMiddleware } from 'redux-saga';
import { takeEvery, put, call, all } from 'redux-saga/effects';

export default class ReduxStore {
    //
    private models: Record<string, Model> = {};

    private middlewares: Middleware[] = [logger];
    /**
     * 添加model
     * @param m
     */
    model(m: Model): ReduxStore {
        this.models[m.namespace] = m;
        return this;
    }
    use(middleware: Middleware): ReduxStore {
        this.middlewares.push(middleware);
        return this;
    }
    start(preloadState?: Record<string, State>): Store {
        const combineState: Record<string, State> = {};
        const reducerMapObjects: Record<string, Reducer> = {};
        const combineSagas: Array<() => Generator> = [];
        forEach((m: Model) => {
            const { namespace, reducer = {}, state, effects = {} } = m;
            combineState[namespace] = state;
            // states
            const mapReducers: Record<string, Reducer> = reduce(
                (acc: Record<string, Reducer>, prop: string) => {
                    acc[`${namespace}/${prop}`] = reducer[prop];
                    return acc;
                },
                {},
                keys(reducer),
            );
            // reducers
            reducerMapObjects[namespace] = (state: typeof m.state = m.state, action: Action): State => {
                const mapReducer = mapReducers[action.type];
                if (mapReducer) {
                    return mapReducer(state, action);
                }
                return state;
            };
            // effects
            forEach((prop: string) => {
                const fn = effects[prop];
                combineSagas.push(function* () {
                    console.log(`${namespace}/${prop}`);
                    yield takeEvery(`${namespace}/${prop}`, function* (action: AnyAction) {
                        yield fn(action, { call, put });
                    });
                });
            }, keys(effects));
        }, values(this.models));
        let sagaMiddleware: SagaMiddleware | null = null;
        if (combineSagas.length > 0) {
            sagaMiddleware = createSagaMiddleware();
            this.middlewares.unshift(sagaMiddleware);
        }
        const store = createStore(
            combineReducers(reducerMapObjects),
            Object.assign(combineState, preloadState || {}),
            applyMiddleware(...this.middlewares),
        );
        if (sagaMiddleware) {
            sagaMiddleware.run(function* () {
                yield all(map((saga) => saga(), combineSagas));
            });
        }
        return store;
    }
}

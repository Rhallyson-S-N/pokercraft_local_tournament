/* tslint:disable */
/* eslint-disable */

/**
 * Represents a bankruptcy metric.
 */
export class BankruptcyMetric {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Get the bankruptcy rate.
     */
    readonly bankruptcyRate: number;
    /**
     * Get the number of simulations performed.
     */
    readonly length: number;
    /**
     * Get the profitable rate.
     */
    readonly profitableRate: number;
    /**
     * Get the survival rate.
     */
    readonly survivalRate: number;
}

/**
 * A playing card in a standard deck of 52 cards.
 */
export class Card {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Create a new Card from a string (e.g., "As" for Ace of Spades).
     */
    constructor(value: string);
    /**
     * Get the card's string representation.
     */
    toString(): string;
    number: CardNumber;
    shape: CardShape;
}

/**
 * Card numbers (ranks) in a standard deck of playing cards.
 */
export enum CardNumber {
    Two = 2,
    Three = 3,
    Four = 4,
    Five = 5,
    Six = 6,
    Seven = 7,
    Eight = 8,
    Nine = 9,
    Ten = 10,
    Jack = 11,
    Queen = 12,
    King = 13,
    Ace = 14,
}

/**
 * Card shapes (suits) in a standard deck of playing cards.
 */
export enum CardShape {
    Spade = 0,
    Heart = 1,
    Diamond = 2,
    Club = 3,
}

/**
 * Result of single equity calculation.
 */
export class EquityResult {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Get the equity of the given player index (0-based).
     */
    getEquity(player_index: number): number;
    /**
     * Check if the given player index (0-based) has never lost in all scenarios.
     */
    neverLost(player_index: number): boolean;
    /**
     * Create a new EquityResult by calculating equities.
     * `hands` is an array of card string pairs, e.g., [["As", "Kh"], ["Qd", "Jc"]]
     * `community` is an array of card strings, e.g., ["2c", "3d", "4h"]
     */
    constructor(hands: Array<any>, community: Array<any>);
}

/**
 * Preflop equity cache for heads-up situations.
 */
export class HUPreflopEquityCache {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Get the equity for player 1 given two hands.
     * Returns the equity as a float between 0.0 and 1.0.
     * Handles all suit symmetries automatically.
     */
    getEquity(hand1_card1: string, hand1_card2: string, hand2_card1: string, hand2_card2: string): number;
    /**
     * Create a HUPreflopEquityCache from gzip-compressed bytes (Uint8Array).
     */
    constructor(bytes: Uint8Array);
}

/**
 * Luck calculator using equity values and results.
 * Results have two `f64` values: equity (0.0 ~ 1.0) and win/lose (0.0 ~ 1.0).
 * Win/lose is represented as `1.0` for win and `0.0` for lose.
 * If there are ties, use fractional values (e.g., `0.5` for a two-way tie).
 */
export class LuckCalculator {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Add a new result to the calculator.
     */
    addResult(equity: number, actual: number): void;
    /**
     * Calculate the Luck-score of the results.
     */
    luckScore(): number;
    /**
     * Create a new empty LuckCalculator.
     */
    constructor();
}

/**
 * Initialize the WASM module (called automatically).
 */
export function init(): void;

/**
 * Simulate the bankruptcy metric (WASM interface).
 * Note: Uses sequential iteration since rayon doesn't work in WASM without special setup.
 */
export function simulate(initial_capital: number, relative_return_results: Float64Array, max_iteration: number, profit_exit_multiplier: number, simulation_count: number): BankruptcyMetric;

/**
 * Get the library version.
 */
export function version(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly version: () => [number, number];
    readonly init: () => void;
    readonly __wbg_equityresult_free: (a: number, b: number) => void;
    readonly __wbg_hupreflopequitycache_free: (a: number, b: number) => void;
    readonly __wbg_luckcalculator_free: (a: number, b: number) => void;
    readonly equityresult_getEquity: (a: number, b: number) => [number, number, number];
    readonly equityresult_neverLost: (a: number, b: number) => [number, number, number];
    readonly equityresult_new_wasm: (a: any, b: any) => [number, number, number];
    readonly hupreflopequitycache_getEquity: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number, number];
    readonly hupreflopequitycache_new_wasm: (a: number, b: number) => [number, number, number];
    readonly luckcalculator_addResult: (a: number, b: number, c: number) => [number, number];
    readonly luckcalculator_luckScore: (a: number) => [number, number, number];
    readonly luckcalculator_new_wasm: () => number;
    readonly __wbg_card_free: (a: number, b: number) => void;
    readonly __wbg_get_card_number: (a: number) => number;
    readonly __wbg_get_card_shape: (a: number) => number;
    readonly __wbg_set_card_number: (a: number, b: number) => void;
    readonly __wbg_set_card_shape: (a: number, b: number) => void;
    readonly card_new_wasm: (a: number, b: number) => [number, number, number];
    readonly card_toString: (a: number) => [number, number];
    readonly __wbg_bankruptcymetric_free: (a: number, b: number) => void;
    readonly bankruptcymetric_bankruptcyRate: (a: number) => number;
    readonly bankruptcymetric_length: (a: number) => number;
    readonly bankruptcymetric_profitableRate: (a: number) => number;
    readonly bankruptcymetric_survivalRate: (a: number) => number;
    readonly simulate: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;

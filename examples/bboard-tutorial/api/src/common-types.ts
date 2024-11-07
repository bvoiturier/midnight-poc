/**
 * Bulletin board common types and abstractions.
 *
 * @module
 */

import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { STATE, AuctionPrivateState, Contract, Witnesses } from '@midnight-ntwrk/bboard-contract-tutorial';

/**
 * The private states consumed throughout the application.
 *
 * @remarks
 * {@link PrivateStates} can be thought of as a type that describes a schema for all
 * private states for all contracts used in the application. Each key represents
 * the type of private state consumed by a particular type of contract.
 * The key is used by the deployed contract when interacting with a private state provider,
 * and the type (i.e., `typeof PrivateStates[K]`) represents the type of private state
 * expected to be returned.
 *
 * Since there is only one contract type for the bulletin board example, we only define a
 * single key/type in the schema.
 *
 * @public
 */
export type PrivateStates = {
  /**
   * Key used to provide the private state for {@link AuctionContract} deployments.
   */
  readonly auctionPrivateState: AuctionPrivateState;
};

/**
 * Represents a bulletin board contract and its private state.
 *
 * @public
 */
export type AuctionContract = Contract<AuctionPrivateState, Witnesses<AuctionPrivateState>>;

/**
 * The keys of the circuits exported from {@link AuctionContract}.
 *
 * @public
 */
export type AuctionCircuitKeys = Exclude<keyof AuctionContract['impureCircuits'], number | symbol>;

/**
 * The providers required by {@link AuctionContract}.
 *
 * @public
 */
export type AuctionProviders = MidnightProviders<AuctionCircuitKeys, PrivateStates>;

/**
 * A {@link AuctionContract} that has been deployed to the network.
 *
 * @public
 */
export type DeployedAuctionContract = FoundContract<AuctionPrivateState, AuctionContract>;

/**
 * A type that represents the derived combination of public (or ledger), and private state.
 */
export type AuctionDerivedState = {
  readonly auction_state: STATE;
  readonly item_description: string;
  readonly minimum_bid: bigint;
  readonly bid_increment: bigint;
  readonly current_bid: bigint | undefined;
  readonly current_bidder: Uint8Array | undefined;
  readonly reserve_price: bigint;
  readonly item_seller: Uint8Array;

  /**
   * A readonly flag that determines if the current message was posted by the current user.
   *
   * @remarks
   * The `poster` property of the public (or ledger) state is the public key of the message poster, while
   * the `secretKey` property of {@link AuctionPrivateState} is the secret key of the current user. If
   * `poster` corresponds to `secretKey`, then `isOwner` is `true`.
   */
  readonly isSeller: boolean;
};

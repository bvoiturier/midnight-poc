/**
 * Provides types and utilities for working with bulletin board contracts.
 *
 * @packageDocumentation
 */

import { type ContractAddress, convert_bigint_to_Uint8Array } from '@midnight-ntwrk/compact-runtime';
import { type Logger } from 'pino';
import type { AuctionDerivedState, AuctionContract, AuctionProviders, DeployedAuctionContract } from './common-types.js';
import {
  type AuctionPrivateState,
  Contract,
  createAuctionPrivateState,
  ledger,
  pureCircuits,
  witnesses,
  STATE,
} from '@midnight-ntwrk/bboard-contract-tutorial';
import * as utils from './utils/index.js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { combineLatest, map, tap, from, type Observable } from 'rxjs';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';

/** @internal */
const auctionContractInstance: AuctionContract = new Contract(witnesses);

/**
 * An API for a deployed bulletin board.
 */
export interface DeployedAuctionAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<AuctionDerivedState>;

  placeBid: (bid: bigint) => Promise<void>;
  concludeAuction: () => Promise<void>;
}

/**
 * Provides an implementation of {@link DeployedAuctionAPI} by adapting a deployed bulletin board
 * contract.
 *
 * @remarks
 * The `AuctionPrivateState` is managed at the DApp level by a private state provider. As such, this
 * private state is shared between all instances of {@link AuctionAPI}, and their underlying deployed
 * contracts. The private state defines a `'secretKey'` property that effectively identifies the current
 * user, and is used to determine if the current user is the poster of the message as the observable
 * contract state changes.
 *
 * In the future, Midnight.js will provide a private state provider that supports private state storage
 * keyed by contract address. This will remove the current workaround of sharing private state across
 * the deployed bulletin board contracts, and allows for a unique secret key to be generated for each bulletin
 * board that the user interacts with.
 */
// TODO: Update AuctionAPI to use contract level private state storage.
export class AuctionAPI implements DeployedAuctionAPI {
  /** @internal */
  private constructor(
    public readonly deployedContract: DeployedAuctionContract,
    providers: AuctionProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    this.state$ = combineLatest(
      [
        // Combine public (ledger) state with...
        providers.publicDataProvider.contractStateObservable(this.deployedContractAddress, { type: 'latest' }).pipe(
          map((contractState) => ledger(contractState.data)),
          tap((ledgerState) =>
            logger?.trace({
              ledgerStateChanged: {
                ledgerState: {
                  ...ledgerState,
                  state: ledgerState.auctionState === STATE.concluded ? 'concluded' : 'opened',
                  seller: toHex(ledgerState.itemSeller),
                },
              },
            }),
          ),
        ),
        // ...private state...
        //    since the private state of the bulletin board application never changes, we can query the
        //    private state once and always use the same value with `combineLatest`. In applications
        //    where the private state is expected to change, we would need to make this an `Observable`.
        from(providers.privateStateProvider.get('auctionPrivateState') as Promise<AuctionPrivateState>),
      ],
      // ...and combine them to produce the required derived state.
      (ledgerState, privateState) => {
        const hashedSecretKey = pureCircuits.public_key(
          privateState.secretKey,
        );

        return {
          auction_state: ledgerState.auctionState,
          item_description: ledgerState.itemDescription,
          minimum_bid: ledgerState.minimumBid,
          bid_increment: ledgerState.bidIncrement,
          current_bid: ledgerState.currentBid.value,
          current_bidder: ledgerState.currentBidder.value,
          reserve_price: ledgerState.reservePrice,
          item_seller: ledgerState.itemSeller,
          isSeller: toHex(ledgerState.itemSeller) === toHex(hashedSecretKey),
        };
      },
    );
  }

  /**
   * Gets the address of the current deployed contract.
   */
  readonly deployedContractAddress: ContractAddress;

  /**
   * Gets an observable stream of state changes based on the current public (ledger),
   * and private state data.
   */
  readonly state$: Observable<AuctionDerivedState>;

  /**
   * Attempts to post a given message to the bulletin board.
   *
   * @param message The message to post.
   *
   * @remarks
   * This method can fail during local circuit execution if the bulletin board is currently occupied.
   */
  async placeBid(bid: bigint): Promise<void> {
    this.logger?.info(`placing bid: ${bid}`);

    const txData =
      // EXERCISE 3: CALL THE post CIRCUIT AND SUBMIT THE TRANSACTION TO THE NETWORK
      await this.deployedContract.callTx // EXERCISE ANSWER
        .place_bid(bid); // EXERCISE ANSWER

    this.logger?.trace({
      transactionAdded: {
        circuit: 'place_bid',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  /**
   * Attempts to take down any currently posted message on the bulletin board.
   *
   * @remarks
   * This method can fail during local circuit execution if the bulletin board is currently vacant,
   * or if the currently posted message isn't owned by the poster computed from the current private
   * state.
   */
  async concludeAuction(): Promise<void> {
    this.logger?.info('concluding auction');

    const txData =
      // EXERCISE 4: CALL THE take_down CIRCUIT AND SUBMIT THE TRANSACTION TO THE NETWORK
      await this.deployedContract.callTx // EXERCISE ANSWER
        .conclude_auction(); // EXERCISE ANSWER

    this.logger?.trace({
      transactionAdded: {
        circuit: 'conclude_auction',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  /**
   * Deploys a new bulletin board contract to the network.
   *
   * @param providers The bulletin board providers.
   * @param logger An optional 'pino' logger to use for logging.
   * @returns A `Promise` that resolves with a {@link AuctionAPI} instance that manages the newly deployed
   * {@link DeployedAuctionContract}; or rejects with a deployment error.
   */
  static async deploy(providers: AuctionProviders, args: [_item_description: string, _minimum_bid: bigint, _bid_increment: bigint, _reserve_price: bigint], logger?: Logger): Promise<AuctionAPI> {
    logger?.info('deployContract');

    // EXERCISE 5: FILL IN THE CORRECT ARGUMENTS TO deployContract
    const deployedAuctionContract = await deployContract(providers, {
      // EXERCISE ANSWER
      privateStateKey: 'auctionPrivateState', // EXERCISE ANSWER
      contract: auctionContractInstance,
      initialPrivateState: await AuctionAPI.getPrivateState(providers, logger),
      args: args
    });

    logger?.trace({
      contractDeployed: {
        finalizedDeployTxData: deployedAuctionContract.deployTxData.public,
      },
    });

    return new AuctionAPI(deployedAuctionContract, providers, logger);
  }

  /**
   * Finds an already deployed bulletin board contract on the network, and joins it.
   *
   * @param providers The bulletin board providers.
   * @param contractAddress The contract address of the deployed bulletin board contract to search for and join.
   * @param logger An optional 'pino' logger to use for logging.
   * @returns A `Promise` that resolves with a {@link AuctionAPI} instance that manages the joined
   * {@link DeployedAuctionContract}; or rejects with an error.
   */
  static async join(providers: AuctionProviders, contractAddress: ContractAddress, logger?: Logger): Promise<AuctionAPI> {
    logger?.info({
      joinContract: {
        contractAddress,
      },
    });

    const deployedAuctionContract = await findDeployedContract(providers, {
      contractAddress,
      contract: auctionContractInstance,
      privateStateKey: 'auctionPrivateState',
      initialPrivateState: await AuctionAPI.getPrivateState(providers, logger),
    });

    logger?.trace({
      contractJoined: {
        finalizedDeployTxData: deployedAuctionContract.deployTxData.public,
      },
    });

    return new AuctionAPI(deployedAuctionContract, providers, logger);
  }

  private static async getPrivateState(providers: AuctionProviders, logger?: Logger): Promise<AuctionPrivateState> {
    const existingPrivateState = await providers.privateStateProvider.get('auctionPrivateState');
    logger?.info(`Existing 'auctionPrivateState' found: ${existingPrivateState ? 'yes' : 'no'}`);
    const privateState = existingPrivateState ?? createAuctionPrivateState(utils.randomBytes(32));
    logger?.info(`Private state 'secret key': ${toHex(privateState.secretKey)}`);
    return privateState;
  }
}

/**
 * A namespace that represents the exports from the `'utils'` sub-package.
 *
 * @public
 */
export * as utils from './utils/index.js';

export * from './common-types.js';

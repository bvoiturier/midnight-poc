import { type Resource } from '@midnight-ntwrk/wallet';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import path from 'path';
import * as api from '../api';
import { type CounterProviders } from '../common-types';
import { currentDir } from '../config';
import { createLogger } from '../logger-utils';
import { TestEnvironment } from './commons';

const logDir = path.resolve(currentDir, '..', 'logs', 'tests', `${new Date().toISOString()}.log`);
const logger = await createLogger(logDir);

describe('API', () => {
  let testEnvironment: TestEnvironment;
  let wallet: Wallet & Resource;
  let providers: CounterProviders;

  beforeAll(async () => {
    api.setLogger(logger);
    testEnvironment = new TestEnvironment(logger);
    const testConfiguration = await testEnvironment.start();
    wallet = await testEnvironment.getWallet();
    providers = await api.configureProviders(wallet, testConfiguration.dappConfig);
  }, 30 * 60_000);

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  it('should deploy the contract and increment the counter [@slow]', async () => {
    allure.description(`Deploys the counter contract, increments it, and verifies the responses.`);
    allure.tms('PM-8552', 'PM-8552');
    allure.severity('blocker');
    allure.tag('counter');

    const counterContract = await api.deploy(providers);
    expect(counterContract).not.toBeNull();

    const counter = await api.displayCounterValue(providers, counterContract);
    expect(counter.counterValue).toEqual(BigInt(0));

    const response = await api.increment(counterContract);
    expect(response.txHash).toMatch(/[0-9a-f]{64}/);
    expect(response.blockHeight).toBeGreaterThan(BigInt(0));

    const counterAfter = await api.displayCounterValue(providers, counterContract);
    expect(counterAfter.counterValue).toEqual(BigInt(1));
    expect(counterAfter.contractAddress).toEqual(counter.contractAddress);
  });
});

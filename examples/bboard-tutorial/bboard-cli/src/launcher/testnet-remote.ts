import { createLogger } from '../logger-utils.js';
import { run } from '../index.js';
import { TestnetRemoteConfig } from '../config.js';

const config = new TestnetRemoteConfig();
config.setNetworkId();
const logger = await createLogger(config.logDir);

const pssPrefix = process.argv.slice(2)[0];
if (pssPrefix) config.privateStateStoreName = pssPrefix + "." + config.privateStateStoreName;
logger.info(`privateStateStoreName: ${config.privateStateStoreName}`);

await run(config, logger);

const merge = require('lodash.merge');

const path = require("path");
const constants = require("utils/const.js");
const diskService = require("services/disk");

const GB_TO_MiB = 953.674;
const MB_TO_MiB = 0.953674;

const DEFAULT_ADVANCED_SETTINGS = {
  // Peer Settings
  clearnet: true,
  torProxyForClearnet: false,
  tor: true,
  i2p: true,
  incomingConnections: false,
  peerblockfilters: true,
  peerbloomfilters: false,
  bantime: 86400,
  maxconnections: 125,
  maxreceivebuffer: 5000,
  maxsendbuffer: 1000,
  maxtimeadjustment: 4200,
  peertimeout: 60,
  timeout: 5000,
  maxuploadtarget: 0,
  // Optimization
  cacheSizeMB: 450,
  mempoolFullRbf: false,
  prune: {
    enabled: false,
    pruneSizeGB: 300,
  },
  blockfilterindex: true,
  maxmempool: 300,
  mempoolexpiry: 336,
  persistmempool: true,
  coinstatsindex: false,
  datacarrier: true,
  datacarriersize: 42,
  permitbaremultisig: false,
  rejectparasites: true,
  rejecttokens: false,
  minrelaytxfee: 0.00001,
  bytespersigop: 20,
  bytespersigopstrict: 20,
  limitancestorcount: 25,
  limitancestorsize: 101,
  limitdescendantcount: 25,
  limitdescendantsize: 101,
  permitbarepubkey: false,
  maxscriptsize: 1650,
  datacarriercost: 1,
  acceptnonstddatacarrier: false,
  dustrelayfee: 0.00003,
  blockmaxsize: 3985000,
  blockmaxweight: 3985000,
  blockreconstructionextratxn: 1000000,
  maxorphantx: 100,
  reindex: false,
  // RPC/REST
  rest: false,
  rpcworkqueue: 128,
  // Network Selection
  network: constants.BITCOIN_DEFAULT_NETWORK
}

async function getJsonStore() {
  try {
    const jsonStore = await diskService.readJsonFile(constants.JSON_STORE_FILE);
    return merge({}, DEFAULT_ADVANCED_SETTINGS, jsonStore);
  } catch (error) {
    return DEFAULT_ADVANCED_SETTINGS;
  }
}

async function applyCustomBitcoinConfig(bitcoinConfig) {
  await applyBitcoinConfig(bitcoinConfig, false);
}

async function applyDefaultBitcoinConfig() {
  await applyBitcoinConfig(DEFAULT_ADVANCED_SETTINGS, true);
}

async function applyBitcoinConfig(bitcoinConfig, shouldOverwriteExistingFile) {
  await Promise.all([
    updateJsonStore(bitcoinConfig),
    generateUmbrelBitcoinConfig(bitcoinConfig),
    generateBitcoinConfig(shouldOverwriteExistingFile),
  ]);
}

// There's a race condition here if you do two updates in parallel but it's fine for our current use case
async function updateJsonStore(newProps) {
  const jsonStore = await getJsonStore();
  return diskService.writeJsonFile(constants.JSON_STORE_FILE, merge(jsonStore, newProps));
}

// creates umbrel-bitcoin.conf
function generateUmbrelBitcoinConfig(settings) {
  const confString = settingsToMultilineConfString(settings);
  return diskService.writePlainTextFile(constants.UMBREL_BITCOIN_CONF_FILEPATH, confString);
}

// creates bitcoin.conf with includeconf=umbrel-bitcoin.conf
async function generateBitcoinConfig(shouldOverwriteExistingFile = false) {
  const baseName = path.basename(constants.UMBREL_BITCOIN_CONF_FILEPATH);
  const includeConfString = `# Load additional configuration file, relative to the data directory.\nincludeconf=${baseName}`;

  const fileExists = await diskService.fileExists(constants.BITCOIN_CONF_FILEPATH);

  // if bitcoin.conf does not exist or should be overwritten, create it with includeconf=umbrel-bitcoin.conf
  if (!fileExists || shouldOverwriteExistingFile) {
    return await diskService.writePlainTextFile(constants.BITCOIN_CONF_FILEPATH, includeConfString);
  }

  const existingConfContents = await diskService.readUtf8File(constants.BITCOIN_CONF_FILEPATH);
  
  // if bitcoin.conf exists but does not include includeconf=umbrel-bitcoin.conf, add includeconf=umbrel-bitcoin.conf to the top of the file
  if (!existingConfContents.includes(includeConfString)) {
    return await diskService.writePlainTextFile(constants.BITCOIN_CONF_FILEPATH, `${includeConfString}\n${existingConfContents}`);
  }

  // do nothing if bitcoin.conf exists and contains includeconf=umbrel-bitcoin.conf
}

function settingsToMultilineConfString(settings) {
  const umbrelBitcoinConfig = [];

  // [CHAIN]
  umbrelBitcoinConfig.push("# [chain]"); 
  if (settings.network !== 'main') {
    umbrelBitcoinConfig.push(`chain=${settings.network}`)
  }

  // [CORE]
  umbrelBitcoinConfig.push(""); 
  umbrelBitcoinConfig.push("# [core]"); 

  // dbcache
  umbrelBitcoinConfig.push("# Maximum database cache size in MiB"); 
  umbrelBitcoinConfig.push(`dbcache=${Math.round(settings.cacheSizeMB * MB_TO_MiB)}`); 

  // mempoolfullrbf
  if (settings.mempoolFullRbf) {
    umbrelBitcoinConfig.push("# Allow any transaction in the mempool of Bitcoin Node to be replaced with newer versions of the same transaction that include a higher fee."); 
    umbrelBitcoinConfig.push('mempoolfullrbf=1'); 
  }

  // prune
  if (settings.prune.enabled) {
    umbrelBitcoinConfig.push("# Reduce disk space requirements to this many MiB by enabling pruning (deleting) of old blocks. This mode is incompatible with -txindex and -coinstatsindex. WARNING: Reverting this setting requires re-downloading the entire blockchain. (default: 0 = disable pruning blocks, 1 = allow manual pruning via RPC, greater than or equal to 550 = automatically prune blocks to stay under target size in MiB).");
    umbrelBitcoinConfig.push(`prune=${Math.round(settings.prune.pruneSizeGB * GB_TO_MiB)}`);
  }
  
  // Only enable txindex if pruning is disabled
  const txindexEnabled = settings.prune.enabled ? '0' : '1';
  umbrelBitcoinConfig.push(`txindex=${txindexEnabled}`);

  // blockfilterindex
  if (settings.blockfilterindex) {
    umbrelBitcoinConfig.push("# Enable all compact filters.");
    umbrelBitcoinConfig.push('blockfilterindex=1');  
  }

  // maxmempool
  umbrelBitcoinConfig.push("# Keep the transaction memory pool below this many megabytes.");
  umbrelBitcoinConfig.push(`maxmempool=${settings.maxmempool}`);

  // mempoolexpiry
  umbrelBitcoinConfig.push("# Do not keep transactions in the mempool longer than this many hours.");
  umbrelBitcoinConfig.push(`mempoolexpiry=${settings.mempoolexpiry}`);

  // persistmempool
  if (settings.persistmempool) {
    umbrelBitcoinConfig.push("# Save the mempool on shutdown and load on restart.");
    umbrelBitcoinConfig.push('persistmempool=1');
  }

  // coinstatsindex
  if (settings.coinstatsindex) {
    umbrelBitcoinConfig.push("# Maintain coinstats index used by the gettxoutsetinfo RPC.");
    umbrelBitcoinConfig.push('coinstatsindex=1');
  }

  // datacarrier
  if (!settings.datacarrier) {
    umbrelBitcoinConfig.push("# Relay and mine data carrier transactions.");
    umbrelBitcoinConfig.push('datacarrier=0');
  }

  // datacarriersize
  umbrelBitcoinConfig.push("# Maximum size of arbitrary data to relay and mine.");
  umbrelBitcoinConfig.push(`datacarriersize=${settings.datacarriersize}`);

  // permitbaremultisig
  if (settings.permitbaremultisig) {
    umbrelBitcoinConfig.push("# Relay non-P2SH multisig.");
    umbrelBitcoinConfig.push('permitbaremultisig=1');
  }

  // rejectparasites
  if (!settings.rejectparasites) {
    umbrelBitcoinConfig.push("# Do not relay transactions that are considered parasitic.");
    umbrelBitcoinConfig.push('rejectparasites=0');
  }

  // rejecttokens
  if (settings.rejecttokens) {
    umbrelBitcoinConfig.push("# Reject transactions that create tokens.");
    umbrelBitcoinConfig.push(`rejecttokens=1`);
  }

  // minrelaytxfee
  umbrelBitcoinConfig.push("# Min Transaction Relay Fee");
  umbrelBitcoinConfig.push(`minrelaytxfee=${settings.minrelaytxfee}`);

  // bytespersigop
  umbrelBitcoinConfig.push("# Equivalent bytes per sigop in transactions for relay and mining");
  umbrelBitcoinConfig.push(`bytespersigop=${settings.bytespersigop}`);

  // bytespersigopstrict
  umbrelBitcoinConfig.push("# Minimum bytes per sigop in transactions we relay and mine");
  umbrelBitcoinConfig.push(`bytespersigopstrict=${settings.bytespersigopstrict}`);

  // limitancestorcount
  umbrelBitcoinConfig.push("# Do not accept transactions if number of in-mempool ancestors is <n> or more");
  umbrelBitcoinConfig.push(`limitancestorcount=${settings.limitancestorcount}`);

  // limitancestorsize
  umbrelBitcoinConfig.push("# Do not accept transactions whose size with all in-mempool ancestors exceeds <n> kilobytes");
  umbrelBitcoinConfig.push(`limitancestorsize=${settings.limitancestorsize}`);

  // limitdescendantcount
  umbrelBitcoinConfig.push("# Do not accept transactions if any ancestor would have <n> or more in-mempool descendants");
  umbrelBitcoinConfig.push(`limitdescendantcount=${settings.limitdescendantcount}`);

  // limitdescendantsize
  umbrelBitcoinConfig.push("# Do not accept transactions if any ancestor would have more than <n> kilobytes of in-mempool descendants");
  umbrelBitcoinConfig.push(`limitdescendantsize=${settings.limitdescendantsize}`);

  // permitbarepubkey
  if (settings.permitbarepubkey) {
    umbrelBitcoinConfig.push("# Relay legacy pubkey outputs");
    umbrelBitcoinConfig.push('permitbarepubkey=1');
  }

  // maxscriptsize
  umbrelBitcoinConfig.push("# Maximum size of scripts we relay and mine, in bytes");
  umbrelBitcoinConfig.push(`maxscriptsize=${settings.maxscriptsize}`);

  // datacarriercost
  umbrelBitcoinConfig.push("# Treat extra data in transactions as at least N vbytes per actual byte");
  umbrelBitcoinConfig.push(`datacarriercost=${settings.datacarriercost}`);

  // acceptnonstddatacarrier
  if (settings.acceptnonstddatacarrier) {
    umbrelBitcoinConfig.push("# Relay and mine non-OP_RETURN datacarrier injection");
    umbrelBitcoinConfig.push('acceptnonstddatacarrier=1');
  }

  // dustrelayfee
  umbrelBitcoinConfig.push("# Fee rate (in BTC/kvB) used to define dust, the value of an output such that it will cost more than its value in fees at this fee rate to spend it.");
  umbrelBitcoinConfig.push(`dustrelayfee=${settings.dustrelayfee}`);

  // blockmaxsize
  umbrelBitcoinConfig.push("# Set maximum block size in bytes");
  umbrelBitcoinConfig.push(`blockmaxsize=${settings.blockmaxsize}`);

  // blockmaxweight
  umbrelBitcoinConfig.push("# Set maximum BIP141 block weight");
  umbrelBitcoinConfig.push(`blockmaxweight=${settings.blockmaxweight}`);

  // blockreconstructionextratxn
  umbrelBitcoinConfig.push("# Extra transactions to keep in memory for compact block reconstructions");
  umbrelBitcoinConfig.push(`blockreconstructionextratxn=${settings.blockreconstructionextratxn}`);

  // maxorphantx
  umbrelBitcoinConfig.push("# Maximum number of orphan transactions to be kept in memory.");
  umbrelBitcoinConfig.push(`maxorphantx=${settings.maxorphantx}`);

  // reindex
  if (settings.reindex) {
    umbrelBitcoinConfig.push('# Rebuild chain state and block index from the blk*.dat files on disk.');
    umbrelBitcoinConfig.push('reindex=1');  
  }

  // [NETWORK]
  umbrelBitcoinConfig.push(""); 
  umbrelBitcoinConfig.push("# [network]"); 

  // clearnet
  if (settings.clearnet) {
    umbrelBitcoinConfig.push('# Connect to peers over the clearnet.')
    umbrelBitcoinConfig.push('onlynet=ipv4');
    umbrelBitcoinConfig.push('onlynet=ipv6');
  }
  
  if (settings.torProxyForClearnet) {
    umbrelBitcoinConfig.push('# Connect through <ip:port> SOCKS5 proxy.');
    umbrelBitcoinConfig.push(`proxy=${constants.TOR_PROXY_IP}:${constants.TOR_PROXY_PORT}`); 
  }

  // tor
  if (settings.tor) {
    umbrelBitcoinConfig.push('# Use separate SOCKS5 proxy <ip:port> to reach peers via Tor hidden services.');
    umbrelBitcoinConfig.push('onlynet=onion');
    umbrelBitcoinConfig.push(`onion=${constants.TOR_PROXY_IP}:${constants.TOR_PROXY_PORT}`);
    umbrelBitcoinConfig.push('# Tor control <ip:port> and password to use when onion listening enabled.');
    umbrelBitcoinConfig.push(`torcontrol=${constants.TOR_PROXY_IP}:${constants.TOR_PROXY_CONTROL_PORT}`);
    umbrelBitcoinConfig.push(`torpassword=${constants.TOR_PROXY_CONTROL_PASSWORD}`);
  }

  // i2p
  if (settings.i2p) {
    umbrelBitcoinConfig.push('# I2P SAM proxy <ip:port> to reach I2P peers.');
    umbrelBitcoinConfig.push(`i2psam=${constants.I2P_DAEMON_IP}:${constants.I2P_DAEMON_PORT}`);
    umbrelBitcoinConfig.push('onlynet=i2p');
  }

  // incoming connections
  umbrelBitcoinConfig.push('# Enable/disable incoming connections from peers.');
  const listen = settings.incomingConnections ? 1 : 0;
  umbrelBitcoinConfig.push(`listen=1`);
  umbrelBitcoinConfig.push(`listenonion=${listen}`);
  umbrelBitcoinConfig.push(`i2pacceptincoming=${listen}`);

  // whitelist
  umbrelBitcoinConfig.push(`# Whitelist peers connecting from local Umbrel IP range. Whitelisted peers cannot be DoS banned and their transactions are always relayed, even if they are already in the mempool.`);
  umbrelBitcoinConfig.push(`whitelist=10.21.0.0/16`);

  // peerblockfilters
  if (settings.peerblockfilters) {
    umbrelBitcoinConfig.push("# Serve compact block filters to peers per BIP 157.");
    umbrelBitcoinConfig.push('peerblockfilters=1');
  }

  // peerbloomfilters
  if (settings.peerbloomfilters) {
    umbrelBitcoinConfig.push("# Support filtering of blocks and transactions with bloom filters.");
    umbrelBitcoinConfig.push('peerbloomfilters=1');
  }

  // bantime
  umbrelBitcoinConfig.push("# Number of seconds to keep misbehaving peers from reconnecting.");
  umbrelBitcoinConfig.push(`bantime=${settings.bantime}`);

  // maxconnections
  umbrelBitcoinConfig.push("# Maintain at most this many connections to peers.");
  umbrelBitcoinConfig.push(`maxconnections=${settings.maxconnections}`);

  // maxreceivebuffer
  umbrelBitcoinConfig.push("# Maximum per-connection receive buffer in KB.");
  umbrelBitcoinConfig.push(`maxreceivebuffer=${settings.maxreceivebuffer}`);

  // maxsendbuffer
  umbrelBitcoinConfig.push("# Maximum per-connection send buffer in KB.");
  umbrelBitcoinConfig.push(`maxsendbuffer=${settings.maxsendbuffer}`);

  // maxtimeadjustment
  umbrelBitcoinConfig.push("# Maximum allowed median peer time offset adjustment.");
  umbrelBitcoinConfig.push(`maxtimeadjustment=${settings.maxtimeadjustment}`);

  // peertimeout
  umbrelBitcoinConfig.push("# The amount of time (in seconds) a peer may be inactive before the connection to it is dropped.");
  umbrelBitcoinConfig.push(`peertimeout=${settings.peertimeout}`);

  // timeout
  umbrelBitcoinConfig.push("# Initial peer connection timeout in milliseconds.");
  umbrelBitcoinConfig.push(`timeout=${settings.timeout}`);

  // maxuploadtarget
  umbrelBitcoinConfig.push("# Maximum total upload target in MB per 24hr period.");
  umbrelBitcoinConfig.push(`maxuploadtarget=${settings.maxuploadtarget}`);

  // [RPC]
  umbrelBitcoinConfig.push("");
  umbrelBitcoinConfig.push("# [rpc]"); 
  // rest
  if (settings.rest) {
    umbrelBitcoinConfig.push("# Accept public REST requests.");
    umbrelBitcoinConfig.push('rest=1');
  }

  // rpcworkqueue
  umbrelBitcoinConfig.push("# Depth of the work queue to service RPC calls.");
  umbrelBitcoinConfig.push(`rpcworkqueue=${settings.rpcworkqueue}`);

  umbrelBitcoinConfig.push("");
  umbrelBitcoinConfig.push(`# Required to configure Tor control port properly`);
  umbrelBitcoinConfig.push(`[${settings.network}]`);
  umbrelBitcoinConfig.push(`bind=0.0.0.0:8333`);
  umbrelBitcoinConfig.push(`bind=${constants.BITCOIND_IP}:8334=onion`);

  return umbrelBitcoinConfig.join('\n');
}

// checks to see if umbrel-bitcoin.conf is up to date, which we use to determine if we need to regenerate the config and restart bitcoind
async function isUmbrelBitcoinConfUpToDate(config) {
  const newUmbrelBitcoinConf = await settingsToMultilineConfString(config);

  let existingUmbrelBitcoinConf = await diskService.fileExists(constants.UMBREL_BITCOIN_CONF_FILEPATH)
    ? await diskService.readUtf8File(constants.UMBREL_BITCOIN_CONF_FILEPATH)
    : '';

  // compare new config to existing umbrel-bitcoin.conf
  return newUmbrelBitcoinConf === existingUmbrelBitcoinConf;
}

module.exports = {
  getJsonStore,
  applyCustomBitcoinConfig,
  applyDefaultBitcoinConfig,
  isUmbrelBitcoinConfUpToDate
};

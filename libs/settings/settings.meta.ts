// This settings metadata file is used as a single source of truth for deriving the following:
// - validation schema per Bitcoin Knots version (settings.schema.ts)
// - default settings values per Bitcoin Knots version
// - The frontend settings page (React form inputs, descriptions, tool-tips, etc.)
// To add a new bitcoin.conf option, just add a new block to the `settingsMetadata` object and check that it is being written to the conf file correctly.

// Available Bitcoin Knots versions
// IMPORTANT:
// - Any version added here needs to be added in the Dockerfile
// - The array of versions must be newest → oldest. We do a simple index comparison to compare versions, so lower index = newer.
export const AVAILABLE_BITCOIN_KNOTS_VERSIONS = ['v29.2', 'v29.1'] as const

// Default Bitcoin Knots version used by bitcoind manager (always the newest version in the array)
export const DEFAULT_BITCOIN_KNOTS_VERSION = AVAILABLE_BITCOIN_KNOTS_VERSIONS[0]
export type BitcoinKnotsVersion = (typeof AVAILABLE_BITCOIN_KNOTS_VERSIONS)[number]

export const LATEST = 'latest' as const
export const VERSION_CHOICES = [LATEST, ...AVAILABLE_BITCOIN_KNOTS_VERSIONS] as const
export type SelectedVersion = (typeof VERSION_CHOICES)[number]

// Tabs for organization (used in the UI to group settings)
export type Tab = 'peers' | 'optimization' | 'rpc-rest' | 'network' | 'version' | 'advanced' | 'policy'

interface BaseOption {
	tab: Tab
	label: string
	// we may want to make this optional in the future if we create settings that don't have a bitcoin label
	bitcoinLabel: string
	description: string
	subDescription?: string
}

interface NumberOption extends BaseOption {
	kind: 'number'
	min?: number
	max?: number
	step?: number
	default: number
	unit?: string
}

interface BooleanOption extends BaseOption {
	kind: 'toggle' // rendered as a Switch
	default: boolean
	disabledWhen?: Record<string, (v: unknown) => boolean>
	disabledMessage?: string
}

interface SelectOption extends BaseOption {
	kind: 'select'
	options: {value: string; label: string}[]
	default: string
}

interface MultiOption extends BaseOption {
	kind: 'multi'
	options: {value: string; label: string}[]
	default: string[]
	requireAtLeastOne: boolean
}

export type Option = NumberOption | BooleanOption | SelectOption | MultiOption

// Optional per-version differences (overrides) for rule fields
// e.g., if the default value for a setting changes between Knots versions, we can override the default value for specific versions.
type VersionOverrides = Partial<{
	default: unknown
	min: number
	max: number
	step: number
	unit: string
	options: {value: string; label: string}[]
	requireAtLeastOne: boolean
	disabledWhen: Record<string, (v: unknown) => boolean>
	disabledMessage: string
}>

// VersionedOption adds version-awareness on top of Option:
// - introducedIn is inclusive (i.e., available from this version and newer)
// - removedIn is exclusive (i.e., not available starting with this version)
// - versionOverrides carries tiny per-version diffs for rule fields only
export type VersionedOption = Option & {
	introducedIn?: BitcoinKnotsVersion // inclusive
	removedIn?: BitcoinKnotsVersion // exclusive
	versionOverrides?: Partial<Record<BitcoinKnotsVersion, VersionOverrides>>
}

// NOTE: this is the single source of truth for the settings metadata. Everything is derived from this object (versioned metadata, versioned schema, default values, UI fields, etc).
// TypeScript infers the type of the object literals below based on the `kind` property.
export const settingsMetadata = {
	/* ===== Peers tab ===== */
	onlynet: {
		tab: 'peers',
		kind: 'multi',
		label: 'Outgoing Peer Connections',
		bitcoinLabel: 'onlynet',
		description: 'Select which networks you will use for outgoing peer connections.',
		options: [
			{value: 'clearnet', label: 'Clearnet'},
			{value: 'tor', label: 'Tor'},
			{value: 'i2p', label: 'I2P'},
		],
		default: ['clearnet', 'tor', 'i2p'],
		requireAtLeastOne: true,
	},

	proxy: {
		tab: 'peers',
		kind: 'toggle',
		label: 'Make All Outgoing Connections to Clearnet Peers Over Tor',
		bitcoinLabel: 'proxy',
		description:
			'Connect to peers available on the clearnet via Tor to preserve your anonymity at the cost of slightly less security.',
		default: false,
		// both clearnet and tor must be enabled to toggle this on
		disabledWhen: {
			onlynet: (v: unknown) => {
				const onlynets = v as string[]
				return !onlynets.includes('clearnet') || !onlynets.includes('tor')
			},
		},
		disabledMessage: 'Both Clearnet and Tor outgoing connections must be enabled to enable this',
	},

	listen: {
		tab: 'peers',
		kind: 'multi',
		label: 'Incoming Peer Connections',
		bitcoinLabel: 'listen, listenonion, i2pacceptincoming',
		// description:
		// 	'Allow other nodes to connect to your node. If you disable this, your node will only connect to other nodes on the network.',
		description:
			'Select which networks you will allow incoming peer connections from. This will broadcast your node to the Bitcoin network to help other nodes access the blockchain. You may need to set up port forwarding on your router to allow incoming connections from clearnet-only peers.',
		options: [
			{value: 'clearnet', label: 'Clearnet'},
			{value: 'tor', label: 'Tor'},
			{value: 'i2p', label: 'I2P'},
		],
		// By default we do not listen for incoming connections
		default: [],
		requireAtLeastOne: false,
	},

	// -natpmp is enabled by default as of Bitcoin Knots v29.2.
	// This means that nodes with -listen enabled but running behind a firewall, such as a local network router, will be reachable if the firewall/router supports any of the PCP or NAT-PMP protocols (without needing to port forward).
	// NAT‑PMP uses UDP 5351 to the LAN router; but we run in Docker bridge mode so these packets hit the Docker bridge/NAT gateway, not the router, so no mapping is created from inside the container.
	// TODO: If umbrelOS adds a way to keep bridge mode but proxy required packets, we can expose this setting (default to `false`) so users with PCP/NAT‑PMP routers can opt in and not have to manually port forward.
	// natpmp: {
	// 	tab: 'peers',
	// 	kind: 'toggle',
	// 	label: 'Enable NAT-PMP Port Mapping',
	// 	bitcoinLabel: 'natpmp',
	// 	description:
	// 		'Automatically request port forwarding from your router using PCP or NAT-PMP for inbound P2P connections on clearnet. Requires a PCP/NAT-PMP capable router and may not work on all networks. Requires a NAT-PMP capable router and may not work on all networks.',
	// 	subDescription:
	// 		'Note: This does not affect Tor or I2P. If disabled, you can still forward ports manually on your router.',
	// 	// Bitcoin Knots default is true
	// 	default: true,
	// },

	peerblockfilters: {
		tab: 'peers',
		kind: 'toggle',
		label: 'Peer Block Filters',
		bitcoinLabel: 'peerblockfilters',
		description:
			'Share compact block filter data with connected light clients (like wallets) connected to your node, allowing them to get only the transaction information they are interested in from your node without having to download the entire blockchain. Enabling this will automatically enable Block Filter Index below.',
		subDescription:
			'⚠ This setting requires Block Filter Index to be enabled (this will be enforced automatically when you save with this setting enabled). If you disable Peer Block Filters, you will need to also manually toggle off Block Filter Index if you want to stop storing block filter data.',
		// Bitcoind Knots default for this is false
		default: true,
	},

	// If Peer Block Filters is enabled, then this will get automatically enabled when the config is written.
	blockfilterindex: {
		tab: 'peers',
		kind: 'toggle',
		label: 'Block Filter Index',
		bitcoinLabel: 'blockfilterindex',
		description:
			'Store an index of compact block filters which allows faster wallet re-scanning. In order to serve compact block filters to peers, you must also enable Peer Block Filters above.',
		subDescription:
			'⚠ To use Block Filter Index with a pruned node, you must enable it when you start the Prune Old Blocks process under the Optimization category. If your node is already pruned and Block Filter Index is off, enabling it will prevent your node from starting. To fix this while keeping Block Filter Index on, you will need to either reindex your node or turn off Prune Old Blocks.',
		// Bitcoind Knots default for this is false
		default: true,
	},

	peerbloomfilters: {
		tab: 'peers',
		kind: 'toggle',
		label: 'Peer Bloom Filters',
		bitcoinLabel: 'peerbloomfilters',
		description:
			'Enable support for BIP37, a feature used by older light clients (like wallets) to get only the transaction information they are interested in from your node without having to download the entire blockchain.',
		subDescription:
			'⚠ Bloom filters can have privacy and denial-of-service (DoS) risks, especially if your node is publicly reachable; its use is discouraged in favour of the more modern compact block filters.',
		default: false,
	},

	bantime: {
		tab: 'peers',
		kind: 'number',
		label: 'Peer Ban Time',
		bitcoinLabel: 'bantime',
		description:
			"Set the duration (in seconds) that a peer will be banned from connecting to your node if they violate protocol rules or exhibit suspicious behavior. By adjusting bantime, you can maintain your node's security and network integrity, while preventing repeat offenders from causing disruptions. A longer bantime increases the ban period, discouraging misbehavior, while a shorter bantime allows for quicker reconnections but may require more frequent manual monitoring of peer activity.",
		step: 1,
		default: 86_400,
		unit: 'sec',
	},

	maxconnections: {
		tab: 'peers',
		kind: 'number',
		label: 'Max Peer Connections',
		bitcoinLabel: 'maxconnections',
		// TODO: maybe talk about outgoing vs incoming here
		description:
			"Set the maximum number of peers your node can connect to simultaneously. By managing this, you can optimize your node's network usage and system resources based on your device's capacity. A higher value enables your node to maintain more connections, potentially improving network stability and data sharing. A lower value conserves system resources and bandwidth, which may be beneficial for devices with limited capabilities.",
		step: 1,
		default: 125,
		unit: 'peers',
	},

	maxreceivebuffer: {
		tab: 'peers',
		kind: 'number',
		label: 'Max Receive Buffer',
		bitcoinLabel: 'maxreceivebuffer',
		description:
			'Set the maximum amount of memory (in kilobytes) allocated for storing incoming data from other nodes in the network. A larger buffer size allows your node to handle more incoming data simultaneously, while a smaller size reduces memory consumption but may limit the amount of data your node can process at once.',
		step: 1,
		default: 5000,
		unit: 'KB',
	},

	maxsendbuffer: {
		tab: 'peers',
		kind: 'number',
		label: 'Max Send Buffer',
		bitcoinLabel: 'maxsendbuffer',
		description:
			'Set the maximum memory (in kilobytes) dedicated to storing outgoing data sent to other nodes in the network. A larger buffer size enables your node to send more data simultaneously, while a smaller size conserves memory but may restrict the volume of data your node can transmit at once.',
		step: 1,
		default: 5000,
		unit: 'KB',
	},

	// maxtimeadjustment - no longer in bitcoind -help-debug
	// https://github.com/bitcoin/bitcoin/pull/28956

	peertimeout: {
		tab: 'peers',
		kind: 'number',
		label: 'Peer Timeout',
		bitcoinLabel: 'peertimeout',
		description:
			"Set the maximum time (in seconds) that your node will wait for a response from a connected peer before considering it unresponsive and disconnecting. Adjusting peertimeout helps you maintain stable connections with responsive peers while ensuring your node doesn't waste resources on unresponsive ones. A shorter timeout value allows for quicker disconnection from unresponsive peers, while a longer timeout provides more time for slow-responding peers to maintain a connection.",
		step: 1,
		min: 1,
		default: 60,
		unit: 'sec',
	},

	timeout: {
		tab: 'peers',
		kind: 'number',
		label: 'Connection Timeout',
		bitcoinLabel: 'timeout',
		description:
			'Set the maximum time (in seconds) that your node will wait for a response from a newly connecting peer during the initial handshake process before considering it unresponsive and disconnecting. Fine-tuning it helps you ensure your node establishes stable connections with responsive peers while avoiding unresponsive ones. A shorter timeout value leads to faster disconnection from unresponsive peers, while a longer timeout allows more time for slow-responding peers to complete the handshake.',
		step: 1,
		min: 1,
		default: 5000,
		unit: 'ms',
	},

	maxuploadtarget: {
		tab: 'peers',
		kind: 'number',
		label: 'Max Upload Target',
		bitcoinLabel: 'maxuploadtarget',
		description:
			"Limit the maximum amount of data (in MB) your node will upload to other peers in the network within a 24-hour period. Setting this to 0 (default) means that there is no limit. By adjusting it, you can optimize your node's bandwidth usage and maintain a balance between sharing data with the network and conserving your internet resources. A higher upload target allows your node to contribute more data to the network, while a lower target helps you save bandwidth for other uses.",
		subDescription:
			'⚠ Peers that are whitelisted are exempt from this limit. By default, your node whitelists apps on your Umbrel (e.g., Electrs). However, external apps and wallets that are connected via the P2P port may fail to receive data from your node if your node hits the 24-hour upload limit.',
		min: 0,
		step: 1,
		default: 0,
		unit: 'MB/24h',
	},

	/* ===== optimizationization tab ===== */
	dbcache: {
		tab: 'optimization',
		kind: 'number',
		label: 'Cache Size',
		bitcoinLabel: 'dbcache',
		description:
			'Choose the size of the UTXO set to store in RAM. A larger cache can speed up the initial synchronization of your Bitcoin node, but after the initial sync is complete, a larger cache value does not significantly improve performance and may use more RAM than needed.',
		min: 4,
		// We don't set the max here because bitcoind will just automatically cap at 16_384 without erroring
		// and this max value has traditionally increased over time with newer releases
		// max: 16_384,
		step: 1,
		default: 450,
		unit: 'MiB',
	},

	prune: {
		tab: 'optimization',
		kind: 'number',
		label: 'Prune Old Blocks',
		bitcoinLabel: 'prune',
		description:
			'Save storage space by pruning (deleting) old blocks and keeping only a limited copy of the blockchain. It may take some time for your node to become responsive after you turn on pruning.',
		subDescription:
			'⚠ txindex is incompatible with a pruned node. It will be automatically disabled when you save with pruning enabled. Note that some connected apps and services may not work with a pruned blockchain. If you turn off pruning after turning it on, you will need to redownload the entire blockchain.',
		// bitcoind units are MiB, but we use GB here for UX
		// 1 MiB = allow manual pruning via RPC, >=550 MiB =
		// automatically prune block files to stay under the specified
		// target size in MiB
		// using GB and a step of 1 means users will never select between 1 MiB or <550 MiB behaviours described above
		default: 0, // 0 disables pruning
		step: 1,
		min: 0,
		unit: 'GB',
	},

	// TODO: should we delete the txindex dir when this is disabled?
	txindex: {
		tab: 'optimization',
		kind: 'toggle',
		label: 'Enable Transaction Indexing',
		bitcoinLabel: 'txindex',
		description: 'Enable transaction indexing to speed up transaction lookups.',
		subDescription:
			'⚠ Many connected apps and services will not work without txindex enabled, so make sure you understand the implications before disabling it. txindex is automatically disabled when pruning is enabled.',
		// bitcoin Knots default is false, but we our default is true
		default: true,
		/** UI hint: disable when prune > 0 */
		disabledWhen: {prune: (v: unknown) => (v as number) > 0},
		disabledMessage: 'automatically disabled when pruning is enabled',
	},

	datacarrier: {
		tab: 'policy',
		kind: 'toggle',
		label: 'Relay Transactions Containing Arbitrary Data',
		bitcoinLabel: 'datacarrier',
		description: 'Relay transactions with OP_RETURN outputs.',
		default: true,
	},

	datacarriersize: {
		tab: 'policy',
		kind: 'number',
		label: 'Max Allowed Size of Arbitrary Data in Transactions',
		bitcoinLabel: 'datacarriersize',
		description: 'Set the maximum size of the data in OP_RETURN outputs (in bytes) that your node will relay.',
		subDescription: 'Note: datacarrier must be enabled for this setting to take effect.',
		default: 42,
		unit: 'bytes',
	},

	permitbaremultisig: {
		tab: 'policy',
		kind: 'toggle',
		label: 'Relay Bare Multisig Transactions',
		bitcoinLabel: 'permitbaremultisig',
		description: 'Relay non-P2SH multisig transactions.',
		default: false,
	},

	rejectparasites: {
		tab: 'policy',
		kind: 'toggle',
		label: 'Reject parasitic transactions',
		bitcoinLabel: 'rejectparasites',
		description: 'Reject parasitic transactions that are non-monetary.',
		default: true,
	},

	rejecttokens: {
		tab: 'policy',
		kind: 'toggle',
		label: 'Reject tokens transactions',
		bitcoinLabel: 'rejecttokens',
		description: 'Reject token transactions (runes).',
		default: false,
	},

	permitbarepubkey: {
		tab: 'policy',
		kind: 'toggle',
		label: 'Permit Bare Pubkey',
		bitcoinLabel: 'permitbarepubkey',
		description: 'Relay legacy pubkey outputs.',
		default: false,
	},
	
	permitbaredatacarrier: {
		tab: 'policy',
		kind: 'toggle',
		label: 'Permit Bare Datacarrier',
		bitcoinLabel: 'permitbaredatacarrier',
		description: 'Relay transactions that only have data carrier outputs',
		default: false,
	},

	datacarriercost: {
		tab: 'policy',
		kind: 'number',
		label: 'Datacarrier cost',
		bitcoinLabel: 'datacarriercost',
		description: 'Treat extra data in transactions as at least N vbytes per actual byte.',
		subDescription: 'Note: datacarrier must be enabled for this setting to take effect.',
		default: 1,
	},

	acceptnonstddatacarrier: {
		tab: 'policy',
		kind: 'toggle',
		label: 'Accept non standard datacarrier',
		bitcoinLabel: 'acceptnonstddatacarrier',
		description: 'Relay and mine non-OP_RETURN datacarrier injection',
		default: false,
	},
	
	maxscriptsize: {
		tab: 'policy',
		kind: 'number',
		label: 'Max script size',
		bitcoinLabel: 'maxscriptsize',
		description: 'Maximum size of scripts (including the entire witness stack) we relay and mine in bytes',
		default: 1650,
	},

	blockmaxsize: {
		tab: 'policy',
		kind: 'number',
		label: 'Max block size in bytes',
		bitcoinLabel: 'blockmaxsize',
		description: 'Set maximum block size in bytes.',
		default: 3985000,
	},

	blockmaxweight: {
		tab: 'policy',
		kind: 'number',
		label: 'Max block size in weight',
		bitcoinLabel: 'blockmaxweight',
		description: 'Set maximum BIP141 block weight.',
		default: 3985000,
	},

	blockreconstructionextratxn: {
		tab: 'optimization',
		kind: 'number',
		label: 'Number of transactions to keep in memory for reconstruction',
		bitcoinLabel: 'blockreconstructionextratxn',
		description: 'Extra transactions to keep in memory for compact block reconstructions',
		default: 32768,
	},
	
	blockreconstructionextratxnsize: {
		tab: 'optimization',
		kind: 'number',
		label: 'Max memory for reconstruction',
		bitcoinLabel: 'blockreconstructionextratxnsize',
		description: 'Upper limit of memory usage (in megabytes) for keeping extra transactions in memory for compact block reconstructions.',
		default: 10,
	},
	
	coinstatsindex: {
		tab: 'optimization',
		kind: 'toggle',
		label: 'Coin Stats Index',
		bitcoinLabel: 'coinstatsindex',
		description: 'Enabling Coinstats Index reduces the time for the gettxoutsetinfo RPC to complete at the cost of using additional disk space.',
		default: false,
	},

	maxmempool: {
		tab: 'optimization',
		kind: 'number',
		label: 'Maximum Mempool Size',
		bitcoinLabel: 'maxmempool',
		description:
			"Set the maximum size that your node will allocate (in RAM) for storing unconfirmed transactions before they are included in a block. By adjusting maxmempool, you can optimize your node's performance and balance memory usage based on your device's capabilities. A larger maxmempool allows your node to store more unconfirmed transactions, providing more accurate statistics on explorer apps like Mempool.",
		default: 300,
		unit: 'MB',
	},

	// Fee policy settings (rates shown as sat/vB; converted to BTC/kvB when writing bitcoin.conf)
	blockmintxfee: {
		tab: 'policy',
		kind: 'number',
		label: 'Minimum Transaction Fee for Block Templates',
		bitcoinLabel: 'blockmintxfee',
		description:
			'Set the lowest fee rate for transactions to be included in block creation. Transactions below this threshold will not be considered when your node is constructing a block template (e.g., used by miners to filter transactions by fee rate).',
		default: 1,
		min: 0,
		// Max derived from Knots MoneyRange(MAX_MONEY): 21,000,000 BTC/kvB → 2_100_000_000_000 sat/vB
		// Knots rejects out-of-range values (errors on startup) and does not clamp.
		max: 2_100_000_000_000,
		step: 0.001,
		unit: 'sat/vB',
	},

	minrelaytxfee: {
		tab: 'policy',
		kind: 'number',
		label: 'Minimum Fee to Relay Transactions',
		bitcoinLabel: 'minrelaytxfee',
		description:
			'Sets the minimum fee rate your node will accept for relaying, mining, transaction creation, and mempool admission. Transactions below this threshold will be neither relayed nor accepted into your mempool.',
		subDescription: '⚠ It is recommended to also change incrementalrelayfee when changing this setting.',
		default: 1,
		min: 0,
		// Max derived from Knots MoneyRange(MAX_MONEY): 21,000,000 BTC/kvB → 2_100_000_000_000 sat/vB
		// Knots rejects out-of-range values (errors on startup) and does not clamp.
		max: 2_100_000_000_000,
		step: 1,
		unit: 'sat/vB',
	},

	incrementalrelayfee: {
		tab: 'policy',
		kind: 'number',
		label: 'Additional Fee for Replacing Transactions',
		bitcoinLabel: 'incrementalrelayfee',
		description: 'Set the minimum fee rate increase necessary to replace an existing transaction in the mempool.',
		subDescription: '⚠ It is recommended to also change minrelaytxfee when changing this setting.',
		default: 1,
		min: 0,
		// Max derived from Knots MoneyRange(MAX_MONEY): 21,000,000 BTC/kvB → 2_100_000_000_000 sat/vB
		// Knots rejects out-of-range values (errors on startup) and does not clamp.
		max: 2_100_000_000_000,
		step: 0.001,
		unit: 'sat/vB',
	},

	mempoolexpiry: {
		tab: 'optimization',
		kind: 'number',
		label: 'Memory Expiration',
		bitcoinLabel: 'mempoolexpiry',
		description:
			"Set the time threshold (in hours) for unconfirmed transactions to remain in your node's mempool before being removed. By adjusting it, you can manage your node's memory usage and ensure outdated, unconfirmed transactions are discarded. A shorter expiry time helps keep your mempool up-to-date and reduces memory usage, while a longer expiry time allows transactions to remain in the pool for an extended period in case of network congestion or delayed confirmations.",
		step: 1,
		default: 336,
		unit: 'hours',
	},

	persistmempool: {
		tab: 'optimization',
		kind: 'toggle',
		label: 'Persist Mempool',
		bitcoinLabel: 'persistmempool',
		description:
			"Saves unconfirmed transactions in your node's mempool when it's shutting down and reloads them upon startup. Enabling this setting helps maintain a consistent mempool and prevents the loss of unconfirmed transactions during a restart. Disabling this setting will clear the mempool upon restart, which may reduce startup time but requires your node to rebuild its mempool from scratch.",
		default: true,
	},

	maxorphantx: {
		tab: 'optimization',
		kind: 'number',
		label: 'Max Orphan Transactions',
		bitcoinLabel: 'maxorphantx',
		description:
			"Set the maximum number of orphan transactions (transactions missing one or more of their inputs) that your node will keep in memory. By fine-tuning it, you can optimize your node's memory usage and manage its performance based on your device's capabilities. A larger limit allows your node to store more orphan transactions, potentially increasing the chances of finding missing inputs. A smaller limit conserves memory but will result in your node evicting some orphan transactions from memory when the limit is reached.",
		step: 1,
		default: 100,
		unit: 'txs',
	},

	/* ===== RPC & REST tab ===== */
	rest: {
		tab: 'rpc-rest',
		kind: 'toggle',
		label: 'Public REST API',
		bitcoinLabel: 'rest',
		description:
			'Enabling the public REST API can help you connect certain wallets and apps to your node. However, because the REST API access is unauthenticated, it can lead to unauthorized access, privacy degradation, and denial-of-service (DoS) attacks.',
		default: false,
	},

	rpcworkqueue: {
		tab: 'rpc-rest',
		kind: 'number',
		label: 'RPC Work Queue Size',
		bitcoinLabel: 'rpcworkqueue',
		description:
			'Set the maximum number of queued Remote Procedure Call (RPC) requests your node can handle (e.g., from connected wallets or other apps), helping you strike a balance between performance and resource usage. Higher values can improve processing speed at the cost of increased system resources.',
		step: 1,
		// Bitcoin Knots default is 64, but we use 128
		// No min or max in Knots, but we should set a min here to avoid the user breaking the UI which relies on RPC calls to show data
		min: 1,
		default: 128,
		unit: 'requests',
	},
	
	datum: {
		tab: 'optimization',
		kind: 'toggle',
		label: 'Enable blocknotify for datum',
		bitcoinLabel: 'datum',
		description:
			'Enable blocknotify for datum to avoid mining stale work.',
		default: true,
	},

	/* ===== Version tab ===== */
	// TODO: finess description and subDescription
	version: {
		tab: 'version',
		kind: 'select',
		label: 'Bitcoin Knots Version',
		bitcoinLabel: 'version',
		description:
			'Select whether to always run the latest version of Bitcoin Knots available in the Bitcoin Node app, or stay on a specific version until you change it manually. Your Bitcoin Node app will continue to receive updates from the Umbrel App Store even if you decide to stay on a specific version.',
		subDescription:
			'⚠ If you choose to stay on a specific version, please make sure your chosen version is up to date with the latest security fixes.',
		options: [
			{value: LATEST, label: 'Always use the latest version'},
			...AVAILABLE_BITCOIN_KNOTS_VERSIONS.map((version) => ({value: version, label: version})),
		],
		default: LATEST,
	},

	/* ===== Network tab ===== */
	chain: {
		tab: 'network',
		kind: 'select',
		label: 'Bitcoin Network',
		bitcoinLabel: 'chain',
		description:
			'Choose which blockchain your node will connect to. If you change the chain, you may need to restart any connected apps to ensure they work correctly.',
		options: [
			{value: 'main', label: 'Mainnet'},
			{value: 'test', label: 'Testnet3'},
			{value: 'testnet4', label: 'Testnet4'},
			{value: 'signet', label: 'Signet'},
			{value: 'regtest', label: 'Regtest'},
		],
		default: 'main',
	},
} satisfies Record<string, VersionedOption>

// Gets the concrete Bitcoin Knots version for a given selected version
export function resolveVersion(desired: SelectedVersion): BitcoinKnotsVersion {
	// We always resolve 'latest' to the default version
	return desired === LATEST ? DEFAULT_BITCOIN_KNOTS_VERSION : desired
}

// Creates the version‑specific metadata for a given Bitcoin Knots version:
export function settingsMetadataForVersion(version: BitcoinKnotsVersion) {
	const metadata: Record<string, Option> = {}
	const versionIdx = AVAILABLE_BITCOIN_KNOTS_VERSIONS.indexOf(version)

	// Loop through each settingsMetadata entry and build the versioned metadata
	for (const [key, value] of Object.entries(settingsMetadata) as Array<[string, VersionedOption]>) {
		// Skip the setting entirely if it is not in the specified Bitcoin Knots version
		if (value.introducedIn && versionIdx > AVAILABLE_BITCOIN_KNOTS_VERSIONS.indexOf(value.introducedIn)) continue
		if (value.removedIn && versionIdx <= AVAILABLE_BITCOIN_KNOTS_VERSIONS.indexOf(value.removedIn)) continue

		// Merge the versioned metadata with the version overrides
		const merged = {
			...value,
			...(value.versionOverrides?.[version] ?? {}),
		} as Record<string, unknown>

		// Strip the versioning keys
		delete merged['introducedIn']
		delete merged['removedIn']
		delete merged['versionOverrides']

		metadata[key] = merged as unknown as Option
	}

	return metadata
}

// Compute default form values for a given Bitcoin Knots version.
export function DefaultValuesForVersion(version: BitcoinKnotsVersion) {
	const metadata = settingsMetadataForVersion(version)
	const defaults = {} as Record<string, unknown>
	for (const key in metadata) defaults[key] = (metadata as Record<string, {default: unknown}>)[key].default
	return defaults
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChainIdToName = exports.ChainId = void 0;
exports.getChainName = getChainName;
exports.getChainIdFromString = getChainIdFromString;
// Chain ID enumeration
var ChainId;
(function (ChainId) {
    // EVM Chains
    ChainId[ChainId["ETHEREUM"] = 1] = "ETHEREUM";
    ChainId[ChainId["BSC"] = 56] = "BSC";
    ChainId[ChainId["POLYGON"] = 137] = "POLYGON";
    ChainId[ChainId["ARBITRUM"] = 42161] = "ARBITRUM";
    ChainId[ChainId["AVALANCHE"] = 43114] = "AVALANCHE";
    ChainId[ChainId["OPTIMISM"] = 10] = "OPTIMISM";
    ChainId[ChainId["FANTOM"] = 250] = "FANTOM";
    ChainId[ChainId["CRONOS"] = 25] = "CRONOS";
    ChainId[ChainId["HECO"] = 128] = "HECO";
    ChainId[ChainId["GNOSIS"] = 100] = "GNOSIS";
    ChainId[ChainId["KCC"] = 321] = "KCC";
    ChainId[ChainId["OPBNB"] = 204] = "OPBNB";
    ChainId[ChainId["ZKSYNC_ERA"] = 324] = "ZKSYNC_ERA";
    ChainId[ChainId["LINEA"] = 59144] = "LINEA";
    ChainId[ChainId["BASE"] = 8453] = "BASE";
    ChainId[ChainId["MANTLE"] = 5000] = "MANTLE";
    ChainId[ChainId["UNICHAIN"] = 130] = "UNICHAIN";
    ChainId[ChainId["SCROLL"] = 534352] = "SCROLL";
    ChainId[ChainId["FON"] = 201022] = "FON";
    ChainId[ChainId["ZKFAIR"] = 42766] = "ZKFAIR";
    ChainId[ChainId["MORPH"] = 2818] = "MORPH";
    ChainId[ChainId["SONEIUM"] = 1868] = "SONEIUM";
    ChainId[ChainId["STORY"] = 1514] = "STORY";
    ChainId[ChainId["SONIC"] = 146] = "SONIC";
    ChainId[ChainId["ABSTRACT"] = 2741] = "ABSTRACT";
    ChainId[ChainId["HASHKEY"] = 177] = "HASHKEY";
    ChainId[ChainId["BERACHAIN"] = 80094] = "BERACHAIN";
    ChainId[ChainId["MONAD"] = 10143] = "MONAD";
    ChainId[ChainId["WORLD_CHAIN"] = 480] = "WORLD_CHAIN";
    ChainId[ChainId["BLAST"] = 81457] = "BLAST";
    ChainId[ChainId["GRAVITY"] = 1625] = "GRAVITY";
    ChainId[ChainId["MINT"] = 185] = "MINT";
    ChainId[ChainId["ZIRCUIT"] = 48899] = "ZIRCUIT";
    ChainId[ChainId["X_LAYER"] = 196] = "X_LAYER";
    ChainId[ChainId["ZKLINK_NOVA"] = 810180] = "ZKLINK_NOVA";
    ChainId[ChainId["BITLAYER"] = 200901] = "BITLAYER";
    ChainId[ChainId["MERLIN"] = 4200] = "MERLIN";
    ChainId[ChainId["MANTA_PACIFIC"] = 169] = "MANTA_PACIFIC";
})(ChainId || (exports.ChainId = ChainId = {}));
// Chain ID to name mapping
exports.ChainIdToName = {
    [ChainId.ETHEREUM]: "Ethereum",
    [ChainId.BSC]: "BSC",
    [ChainId.POLYGON]: "Polygon",
    [ChainId.ARBITRUM]: "Arbitrum",
    [ChainId.AVALANCHE]: "Avalanche",
    [ChainId.OPTIMISM]: "Optimism",
    [ChainId.FANTOM]: "Fantom",
    [ChainId.CRONOS]: "Cronos",
    [ChainId.HECO]: "HECO",
    [ChainId.GNOSIS]: "Gnosis",
    [ChainId.KCC]: "KCC",
    [ChainId.OPBNB]: "opBNB",
    [ChainId.ZKSYNC_ERA]: "zkSync Era",
    [ChainId.LINEA]: "Linea Mainnet",
    [ChainId.BASE]: "Base",
    [ChainId.MANTLE]: "Mantle",
    [ChainId.UNICHAIN]: "Unichain",
    [ChainId.SCROLL]: "Scroll",
    [ChainId.FON]: "FON",
    [ChainId.ZKFAIR]: "ZKFair",
    [ChainId.MORPH]: "Morph",
    [ChainId.SONEIUM]: "Soneium",
    [ChainId.STORY]: "Story",
    [ChainId.SONIC]: "Sonic",
    [ChainId.ABSTRACT]: "Abstract",
    [ChainId.HASHKEY]: "Hashkey",
    [ChainId.BERACHAIN]: "Berachain",
    [ChainId.MONAD]: "Monad",
    [ChainId.WORLD_CHAIN]: "World Chain",
    [ChainId.BLAST]: "Blast",
    [ChainId.GRAVITY]: "Gravity",
    [ChainId.MINT]: "Mint",
    [ChainId.ZIRCUIT]: "Zircuit",
    [ChainId.X_LAYER]: "X Layer Mainnet",
    [ChainId.ZKLINK_NOVA]: "zkLink Nova",
    [ChainId.BITLAYER]: "Bitlayer Mainnet",
    [ChainId.MERLIN]: "Merlin",
    [ChainId.MANTA_PACIFIC]: "Manta Pacific"
};
// Helper function to get chain name from chain ID
function getChainName(chainId) {
    return exports.ChainIdToName[chainId] || "Unknown Chain";
}
// Helper function to get chain ID from string
function getChainIdFromString(chainId) {
    // Handle numeric chain IDs
    const numericId = parseInt(chainId);
    if (!isNaN(numericId)) {
        return numericId;
    }
    return undefined;
}

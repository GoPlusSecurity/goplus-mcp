// 链ID类型
export var ChainId;
(function (ChainId) {
    ChainId[ChainId["ETHEREUM"] = 1] = "ETHEREUM";
    ChainId[ChainId["BSC"] = 56] = "BSC";
    ChainId[ChainId["POLYGON"] = 137] = "POLYGON";
    ChainId[ChainId["ARBITRUM"] = 42161] = "ARBITRUM";
    ChainId[ChainId["AVALANCHE"] = 43114] = "AVALANCHE";
    ChainId[ChainId["OPTIMISM"] = 10] = "OPTIMISM";
    ChainId[ChainId["FANTOM"] = 250] = "FANTOM";
})(ChainId || (ChainId = {}));

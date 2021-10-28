# chain-explorer-tax

Exploring chain data for easier tax accounting

/data contains a word cloud for identifying the address to the actual smart contract

abi data provided comes from etherscan currently, but any explorer api will have this. once the "input" field is decoded with abi, it provides the function name
e.g. "deposit", "transfer" etc which can be used to categorize the transaction and use that for capital gains/loss/income

todos:
- add in coingecko to get token price info
- update formatting of the .jsons to make it easier to add them up to get total capital gain, income
- test out on polygon

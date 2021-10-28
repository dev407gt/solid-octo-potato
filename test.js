// questions
// 1. how do i classify the transfers from exchange to crypto wallet? -> maybe treat this as a sell, and then as a buy on the crypto wallet, keeping them separate
// 2. how do i classify the bridges? likewise, on the above
// 3. how do i classify the airdrops? income
// TODO: investigate in the future how to treat bridges as transfers instead

import { writeJsonFile } from "write-json-file";
import * as etherscan from "etherscan-api";
import abiDecoder from "abi-decoder";
import sqlite3 from "sqlite3";
import path from "path";
import dotenv from 'dotenv'
dotenv.config()

// from: https://github.com/iraykhel/blockchain-address-database
const sqlitePath = path.resolve("./data/addresses.db");
var db = new sqlite3.Database(sqlitePath);
// hack to look like node-postgres
// https://blog.pagesd.info/2019/10/29/use-sqlite-node-async-await/
db.query = function (sql, params) {
  var that = this;
  return new Promise(function (resolve, reject) {
    that.all(sql, params, function (error, rows) {
      if (error) reject(error);
      else resolve({ rows: rows });
    });
  });
};

const api = etherscan.init(process.env.ETHERSCAN_API_KEY);

function toDateStr(timestamp){
  var date = new Date(0);
  date.setUTCSeconds(timestamp);
  return date
}

const testDecoder = async (txHash, contractAddr, txInput) => {
  // TODO: test this later with pro etherscan account
  // const { result: token } = await api.token.tokeninfo('0x5d3a536e4d6dbd6114cc1ead35777bab948e3643')

  const result = await db.query(
    "SELECT * FROM ETH_addresses WHERE address = ?",
    contractAddr
  );

  const { result: abi } = await api.contract.getabi(
    contractAddr
  );

  const erc20Abi = JSON.parse(abi);
  abiDecoder.addABI(erc20Abi);

  let decodedData = abiDecoder.decodeMethod(
    txInput
  );
  
  return { result, decodedData }
};

const runner1 = async () => {
  // pull all the transactions
  // write to a file for tracking/verifying later
  const txList = await api.account.txlist(process.env.TEST_ETH_WALLET_ADDR, 0, 99999999999, -1);
  await writeJsonFile("foo.json", txList);

  // pull all token txs
  const tokentx = await api.account.tokentx(process.env.TEST_ETH_WALLET_ADDR, '', 1, 999999999, -1)
  await writeJsonFile("tokentx.json", tokentx);

  for (let i = 0; i < txList.result.length; i++) {
    try {
      const tx = txList.result[i];

      // get data on the transaction action
      if (tx.input && tx.input !== '0x') {
        const decoderRes = await testDecoder(tx.hash, tx.to === process.env.TEST_ETH_WALLET_ADDR ? tx.from : tx.to, tx.input)
        txList.result[i] = {...txList.result[i], decoderRes}
      }

      // make timestamp human readable
      txList.result[i].date = toDateStr(tx.timeStamp)

      // merge in the tokentx data if available
      const tokeninfo = tokentx.result.find((row) => row.hash === tx.hash)
      txList.result[i].tokeninfo = tokeninfo
    } catch (e) {
      console.log("error ", e)
    }
  }

  // write to a file for tracking/verifying later
  await writeJsonFile("foo.json", txList);

  // TODO: run each transaction through calculate
};

const runner2 = async () => {
  const txList = await api.account.txlist(process.env.TEST_ETH_WALLET_ADDR, 0, 99999999999, -1);
  const tokentx = await api.account.tokentx(process.env.TEST_ETH_WALLET_ADDR, '', 1, 999999999, -1)

  const final = []
  // generate the tax treatment .json
  for (let i = 0; i < txList.result.length; i++) {
    try {
      const res = {};

      const tx = txList.result[i];

      // get data on the transaction action if available
      let decoderRes = '';
      if (tx.input && tx.input !== '0x') {
        decoderRes = await testDecoder(tx.hash, tx.to === process.env.TEST_ETH_WALLET_ADDR ? tx.from : tx.to, tx.input)
      }

      // the tokentx data if available
      const tokeninfo = tokentx.result.find((row) => row.hash === tx.hash)

      console.log(tx)
      console.log(decoderRes)
      console.log(tokeninfo)
      console.log('----------------------\n')
      
      // TODO: 
      // row = {
      //   tax_treatment: '',
      //   rate: '',
      //   from: '',
      //   to: '',
      //   amount: '',
      //   token: ''
      // }
      // res = {
      //   type: "",
      //   hash: tx.hash,
      //   timestamp: tx.timeStamp,
      //   classification_certainty: 0,
      //   rate_inferred: false,
      //   rate_inferred: false,
      // }
      final.push(res)
    } catch (e) {
      console.log("error ", e)
    }
  }

  await writeJsonFile("final.json", final);

}

runner2()

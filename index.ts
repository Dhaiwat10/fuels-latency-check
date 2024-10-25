import {
  buildFunctionResult,
  Contract,
  Provider,
  TESTNET_NETWORK_URL,
  TransactionCost,
  WalletUnlocked,
} from 'fuels';
import abi from './contract/out/debug/contract-abi.json';

const contractId =
  '0xee05d6ce596f08b356200a0db241ffa737da703104a8f0a9304ee3704b74b9cd';
const provider = await Provider.create(TESTNET_NETWORK_URL);
const wallet = new WalletUnlocked(
  process.env.WALLET_PRIVATE_KEY as string,
  provider
);

const contract = new Contract(contractId, abi, wallet);
const scope = contract.functions.get_count();
const transactionRequest = await scope.getTransactionRequest();

let txCost: TransactionCost | undefined;

for (let i = 0; i < 10; i++) {
  const startTime = performance.now();

  if (!txCost) {
    txCost = await wallet.getTransactionCost(transactionRequest);

    console.log(`Required assets: ${txCost.requiredQuantities.length}`); 
  }

  const req = await wallet.fund(transactionRequest, txCost);

  req.gasLimit = txCost.gasUsed;
  req.maxFee = txCost.maxFee;

  const response = await wallet.sendTransaction(req, {
    estimateTxDependencies: false,
  });
  await response.waitForResult();
  const { value } = await buildFunctionResult({
    funcScope: scope,
    isMultiCall: false,
    program: contract,
    transactionResponse: response,
  });

  const endTime = performance.now();
  const executionTime = endTime - startTime;

  console.log(
    `Iteration ${i + 1}: Execution time: ${executionTime.toFixed(2)} ms`
  );
}

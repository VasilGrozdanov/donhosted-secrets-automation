const {
  SecretsManager
} = require("@chainlink/functions-toolkit");
const ethers = require("ethers");

const makeRequestSepolia = async () => {
  // const routerAddress = "0xf9B8fc078197181C841c296C876945aaa425B278";
  // const donId = "fun-base-sepolia-1";
  // const gatewayUrls = [
  //   "https://01.functions-gateway.testnet.chain.link/",
  //   "https://02.functions-gateway.testnet.chain.link/",
  // ];
  // hardcoded for Ethereum Sepolia
  const routerAddress = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";
  const rewardResolverAddress = "0x62c10d09f538b0a8f0fa403FAf14a1fF23f1e5e4";
  const donId = "fun-ethereum-sepolia-1";
  const gatewayUrls = [
    "https://01.functions-gateway.testnet.chain.link/",
    "https://02.functions-gateway.testnet.chain.link/",
  ];

  const secrets = { apiKey: process.env.API_KEY };
  const slotIdNumber = 0; // slot ID where to upload the secrets
  const expirationTimeMinutes = 60 * 24 * 3; // expiration time in minutes of the secrets
  const gasLimit = 300000;

  // Initialize ethers signer and provider to interact with the contracts onchain
  const privateKey = process.env.PRIVATE_KEY; // fetch PRIVATE_KEY
  if (!privateKey)
    throw new Error(
      "private key not provided - check your environment variables"
    );

  const rpcUrl = process.env.RPC_URL; // fetch Sepolia RPC URL

  if (!rpcUrl)
    throw new Error(`rpcUrl not provided  - check your environment variables`);

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  const wallet = new ethers.Wallet(privateKey);
  const signer = wallet.connect(provider); // create ethers signer for 
  // console.log("Test call");

  // const abi = [ // Minimal ABI for testing
  //   "function owner() public view returns (address)"
  // ];

  // const contract = new ethers.Contract(routerAddress, abi, signer);

  // try {
  //   const owner = await contract.owner();
  //   console.log("owner:", owner);
  // } catch (err) {
  //   console.error("Error interacting with contract:", err);
  // }
  console.log("\nMake request...");

  // First encrypt secrets and upload the encrypted secrets to the DON
  const secretsManager = new SecretsManager({
    signer: signer,
    functionsRouterAddress: routerAddress,
    donId: donId,
  });
  await secretsManager.initialize();

  // Encrypt secrets and upload to DON
  const encryptedSecretsObj = await secretsManager.encryptSecrets(secrets);

  console.log(
    `Upload encrypted secret to gateways ${gatewayUrls}. slotId ${slotIdNumber}. Expiration in minutes: ${expirationTimeMinutes}`
  );
  // Upload secrets
  const uploadResult = await secretsManager.uploadEncryptedSecretsToDON({
    encryptedSecretsHexstring: encryptedSecretsObj.encryptedSecrets,
    gatewayUrls: gatewayUrls,
    slotId: slotIdNumber,
    minutesUntilExpiration: expirationTimeMinutes,
  });

  if (!uploadResult.success)
    throw new Error(`Encrypted secrets not uploaded to ${gatewayUrls}`);

  console.log(
    `\n✅ Secrets uploaded properly to gateways ${gatewayUrls}! Gateways response: `,
    uploadResult
  );

  const donHostedSecretsVersion = parseInt(uploadResult.version); // fetch the reference of the encrypted secrets

  const encryptedSecretsReference = secretsManager.buildDONHostedEncryptedSecretsReference({
    slotId: slotIdNumber,
    version: donHostedSecretsVersion
  });

  console.log(`\nMake a note of the encryptedSecretsReference: ${encryptedSecretsReference} `);
  console.log("Update encrypted secret to contract");

  const abi = [ // Minimal ABI for setting the secret refference
    "function setDonHostedSecret(bytes calldata donHostedSecret) external",
  ];

  const contract = new ethers.Contract(rewardResolverAddress, abi, signer);

  try {
    await contract.setDonHostedSecret(encryptedSecretsReference);
  } catch (err) {
    console.error("Error interacting with contract:", err);
  }
};

makeRequestSepolia().catch((e) => {
  console.error(e);
  process.exit(1);
});

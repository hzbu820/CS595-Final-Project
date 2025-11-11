import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { ethers } from 'hardhat';

type DeploymentInfo = {
  address: string;
  chainId: string;
  owner: string;
  timestamp: string;
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const owner = process.env.OWNER_ADDRESS ?? deployer.address;

  const contract = await ethers.deployContract('FoodTraceability', [owner]);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const network = await deployer.provider?.getNetwork();

  console.log(FoodTraceability deployed by );
  console.log(Owner set to );
  console.log(Contract address: );

  const info: DeploymentInfo = {
    address,
    owner,
    chainId: network ? network.chainId.toString() : 'unknown',
    timestamp: new Date().toISOString(),
  };

  const deploymentsDir = path.resolve(__dirname, '../deployments');
  await mkdir(deploymentsDir, { recursive: true });
  const outFile = path.join(
    deploymentsDir,
    FoodTraceability-.json,
  );
  await writeFile(outFile, JSON.stringify(info, null, 2));
  console.log(Saved deployment metadata to );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

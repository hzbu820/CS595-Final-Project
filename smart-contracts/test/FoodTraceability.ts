import { expect } from 'chai';
import { ethers } from 'hardhat';

const hash = (value: string) => ethers.keccak256(ethers.toUtf8Bytes(value));

describe('FoodTraceability', () => {
  const batchId = 'BATCH-001';

  it('creates batches and stores events', async () => {
    const [owner, producer, transporter] = await ethers.getSigners();
    const contract = await ethers.deployContract('FoodTraceability', [owner.address]);

    await contract.connect(owner).setRole(producer.address, 1); // Producer
    await contract.connect(owner).setRole(transporter.address, 2); // Transporter

    await expect(
      contract
        .connect(producer)
        .createBatch(batchId, transporter.address, 'cid://create', hash('create')),
    ).to.emit(contract, 'BatchCreated');

    const [, events] = await contract.getBatchSummary(batchId);
    expect(events.length).to.equal(1);
    expect(events[0].eventType).to.equal('CREATE');
  });
});

import { useState } from 'react';
import { useWallet } from '../../context/walletContext';
import { signEventPayload } from '../../lib/signing';
import { createBatchEnvelope, uploadSignedEvent, updateBatchStatus, updateEventStatus } from '../../lib/api';

type StepStatus = 'pending' | 'running' | 'success' | 'error';

interface TestStep {
    id: string;
    name: string;
    status: StepStatus;
    message?: string;
}

const generateBatchId = () => {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return '0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
};

const buildSampleMeta = () => ({
    product: 'Test Food Product',
    origin: 'Test-Origin-001',
    productionDate: Math.floor(Date.now() / 1000),
    lot: `LOT-${Math.floor(Math.random() * 10000)}`,
    temperatureC: Number((2 + Math.random() * 3).toFixed(1)),
    notes: 'System test data',
});

export const SystemTestScreen = () => {
    const { provider, contract, account } = useWallet();
    const [steps, setSteps] = useState<TestStep[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [testBatchId, setTestBatchId] = useState('');

    const updateStep = (id: string, status: StepStatus, message?: string) => {
        setSteps(prev => prev.map(s => s.id === id ? { ...s, status, message } : s));
    };

    const runFullTest = async () => {
        if (!provider || !contract || !account) {
            alert('Connect wallet first');
            return;
        }

        setIsRunning(true);
        const batchId = generateBatchId();
        setTestBatchId(batchId);

        const testSteps: TestStep[] = [
            { id: 'create', name: 'Create Batch', status: 'pending' },
            { id: 'append', name: 'Append Event', status: 'pending' },
            { id: 'transfer', name: 'Transfer Custody', status: 'pending' },
            { id: 'verify', name: 'Verify Batch', status: 'pending' },
        ];
        setSteps(testSteps);

        try {
            // Step 1: Create Batch - reusing CreateBatchScreen pattern
            updateStep('create', 'running', 'Signing batch creation...');
            const meta = buildSampleMeta();
            const createSignature = await signEventPayload(provider, {
                batchId,
                eventType: 'Create',
                data: JSON.stringify(meta),
            });

            updateStep('create', 'running', 'Uploading to backend...');
            const upload = await createBatchEnvelope({
                batchId,
                meta,
                signature: createSignature,
                signer: account,
                custodian: account,
            });

            updateStep('create', 'running', 'Sending to blockchain...');
            const createTx = await contract["createBatch(string,address,string,bytes32)"](batchId, account, upload.cid, upload.saltedHash);
            const createReceipt = await createTx.wait();
            await updateBatchStatus(batchId, 'confirmed', createReceipt.hash);
            updateStep('create', 'success', `Tx: ${createReceipt.hash.slice(0, 12)}...`);

            // Step 2: Append Event - reusing AppendEventScreen pattern
            updateStep('append', 'running', 'Signing event...');
            const eventData = { ...meta, temperatureC: Number((meta.temperatureC + 1).toFixed(1)), note: 'Temperature reading' };
            const eventSignature = await signEventPayload(provider, {
                batchId,
                eventType: 'Temperature',
                data: JSON.stringify(eventData),
            });

            updateStep('append', 'running', 'Uploading event...');
            const eventUpload = await uploadSignedEvent({
                batchId,
                eventType: 'Temperature',
                data: eventData,
                signature: eventSignature,
                signer: account,
            });

            updateStep('append', 'running', 'Appending on-chain...');
            const appendTx = await contract["appendEvent(string,string,string,bytes32)"](batchId, 'Temperature', eventUpload.cid, eventUpload.saltedHash);
            const appendReceipt = await appendTx.wait();
            await updateEventStatus(eventUpload.cid, 'confirmed', appendReceipt.hash);
            updateStep('append', 'success', `Event CID: ${eventUpload.cid.slice(0, 12)}...`);

            // Step 3: Transfer Custody - reusing TransferCustodyScreen pattern
            updateStep('transfer', 'running', 'Transferring custody...');
            const transferTx = await contract.transferCustody(batchId, account);
            const transferReceipt = await transferTx.wait();
            updateStep('transfer', 'success', `Tx: ${transferReceipt.hash.slice(0, 12)}...`);

            // Step 4: Verify Batch - reusing ViewerScreen pattern
            updateStep('verify', 'running', 'Fetching batch summary...');
            const [summary, events] = await contract.getBatchSummary(batchId);

            const isValid = summary.exists && events.length >= 2;
            if (isValid) {
                updateStep('verify', 'success', `Batch verified! ${events.length} events found.`);
            } else {
                updateStep('verify', 'error', 'Verification failed: batch data incomplete');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            const currentStep = testSteps.find(s => s.status === 'running' || s.status === 'pending');
            if (currentStep) {
                updateStep(currentStep.id, 'error', message);
            }
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="screen-card form">
            <h2>System Test Runner</h2>
            <p className="screen-description">
                Run a full end-to-end test: Create Batch → Append Event → Transfer Custody → Verify. Reuses existing
                patterns from CreateBatch, AppendEvent, TransferCustody, and Viewer screens.
            </p>

            <button className="primary" type="button" onClick={runFullTest} disabled={isRunning || !contract}>
                {isRunning ? 'Running Tests...' : 'Run System Test'}
            </button>

            {testBatchId && (
                <div className="callout">
                    <p><strong>Test Batch ID:</strong> {testBatchId.slice(0, 16)}...</p>
                </div>
            )}

            {steps.length > 0 && (
                <div className="timeline">
                    <h3>Test Progress</h3>
                    <ul>
                        {steps.map((step) => (
                            <li key={step.id}>
                                <p>
                                    <strong>{step.name}</strong>:{' '}
                                    <span
                                        className={
                                            step.status === 'success'
                                                ? 'success'
                                                : step.status === 'error'
                                                    ? 'error'
                                                    : step.status === 'running'
                                                        ? 'warning'
                                                        : ''
                                        }
                                    >
                                        {step.status === 'pending' && '⏳ Pending'}
                                        {step.status === 'running' && '⏳ Running...'}
                                        {step.status === 'success' && '✓ Success'}
                                        {step.status === 'error' && '✗ Error'}
                                    </span>
                                </p>
                                {step.message && <p className="screen-description">{step.message}</p>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

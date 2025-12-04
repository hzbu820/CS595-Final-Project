// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';

contract FoodTraceability is Ownable {
    enum Role {
        Producer,
        Transporter,
        Retailer,
        Inspector,
        Regulator
    }

    struct Batch {
        string batchId;
        address creator;
        address currentCustodian;
        bool exists;
        string recallReason;
        uint256 createdAt;
        BatchState state;
    }

    struct EventRecord {
        string eventType;
        address actor;
        string cid;
        bytes32 dataHash;
        uint256 timestamp;
    }

    mapping(address => Role) public roles;
    mapping(address => bool) public registered;
    mapping(address => bool) public admins;
    mapping(bytes32 => Batch) private batches;
    mapping(bytes32 => EventRecord[]) private _batchEvents;
    mapping(bytes32 => ComplianceCheck[]) private compliance;
    uint256 public totalBatches;

    event RoleUpdated(address indexed account, Role role);
    event BatchCreated(
        string batchId,
        address indexed creator,
        address indexed custodian,
        string cid,
        bytes32 dataHash
    );
    event EventAppended(
        string batchId,
        address indexed actor,
        string eventType,
        string cid,
        bytes32 dataHash
    );
    event CustodyTransferred(string batchId, address indexed from, address indexed to);
    event RecallStatusChanged(string batchId, bool recalled, string reason);
    event ComplianceVerified(string indexed batchId, string condition, bool passed);

    enum BatchState {
        Active,
        Sold,
        Recalled,
        Closed
    }
    event BatchStateChanged(string batchId, BatchState newState);

    struct ComplianceCheck {
        string condition;
        bool passed;
        address verifier;
        uint256 timestamp;
    }

    constructor(address owner_) Ownable(owner_) {}

    function setRole(address account, Role role) external onlyAdmin {
        roles[account] = role;
        registered[account] = true;
        emit RoleUpdated(account, role);
    }

    function registerParticipant(address user, uint8 role) external onlyAdmin {
        require(role <= uint8(Role.Regulator), "invalid role");
        roles[user] = Role(role);
        registered[user] = true;
        emit RoleUpdated(user, Role(role));
    }

    function disableParticipant(address user) external onlyAdmin {
        registered[user] = false;
    }

    function participants(address addr) external view returns (bool enabled, uint8 role) {
        return (registered[addr], uint8(roles[addr]));
    }

    function addAdmin(address newAdmin) external onlyOwner {
        require(newAdmin != address(0), "invalid address");
        admins[newAdmin] = true;
    }

    function removeAdmin(address admin) external onlyOwner {
        admins[admin] = false;
    }

    function getOwner() external view returns (address) {
        return owner();
    }

    function transferOwner(address newOwner) external onlyOwner {
        transferOwnership(newOwner);
    }

    // Create a new batch
    function createBatch(
        string calldata batchId,
        address firstCustodian,
        string calldata cid,
        bytes32 dataHash
    ) external onlyRole(Role.Producer) {
        require(bytes(batchId).length > 0, 'batchId required');
        require(firstCustodian != address(0), 'custodian required');
        require(_isAuthorizedWriter(firstCustodian), 'custodian must be authorized');

        bytes32 key = _batchKey(batchId);
        Batch storage batch = batches[key];
        require(!batch.exists, 'batch exists');

        batch.batchId = batchId;
        batch.creator = msg.sender;
        batch.currentCustodian = firstCustodian;
        batch.exists = true;
        batch.createdAt = block.timestamp;
        batch.state = BatchState.Active;

        totalBatches += 1;

        _recordEvent(key, 'CREATE', cid, dataHash);

        emit BatchCreated(batchId, msg.sender, firstCustodian, cid, dataHash);
    }

    function markBatchSold(string calldata batchId) external onlyCustodian(batchId) {
        bytes32 key = _batchKey(batchId);
        Batch storage batch = batches[key];

        require(batch.state == BatchState.Active, 'batch not active');
        require(roles[msg.sender] == Role.Retailer, 'only retailer can mark sold');

        batch.state = BatchState.Sold;
        _recordEvent(key, 'SOLD', '', bytes32(0));
        emit BatchStateChanged(batchId, BatchState.Sold);
    }

    function closeBatch(string calldata batchId) external onlyOwner {
        bytes32 key = _requireBatch(batchId);
        Batch storage batch = batches[key];
        require(batch.state == BatchState.Active, 'batch not active');

        batch.state = BatchState.Closed;
        _recordEvent(key, 'CLOSED', '', bytes32(0));
        emit BatchStateChanged(batchId, BatchState.Closed);
    }

    // Frontend / view functions
    // -------------------------------------------
    function getBatchState(string calldata batchId) external view returns (BatchState) {
        bytes32 key = _requireBatch(batchId);
        return batches[key].state;
    }

    function getBatchSummary(string calldata batchId)
        external
        view
        returns (Batch memory summary, EventRecord[] memory events)
    {
        bytes32 key = _requireBatch(batchId);
        Batch storage batch = batches[key];
        summary = batch;
        events = _batchEvents[key];
    }

    function getEvent(string calldata batchId, uint256 index)
        external
        view
        returns (EventRecord memory)
    {
        bytes32 key = _requireBatch(batchId);
        require(index < _batchEvents[key].length, 'index out of bounds');
        return _batchEvents[key][index];
    }

    function getRole(address account) external view returns (Role) {
        return roles[account];
    }

    function isRecalled(string calldata batchId) external view returns (bool) {
        bytes32 key = _requireBatch(batchId);
        return batches[key].state == BatchState.Recalled;
    }

    function getCurrentCustodian(string calldata batchId) external view returns (address) {
        bytes32 key = _requireBatch(batchId);
        return batches[key].currentCustodian;
    }

    function getBatchCount() external view returns (uint256) {
        return totalBatches;
    }

    function batchEvents(bytes32 batchId, uint256 index) external view returns (bytes32) {
        require(index < _batchEvents[batchId].length, "index out of bounds");
        return _batchEvents[batchId][index].dataHash;
    }

    

    // -------------------------------------------

    function appendEvent(
        string calldata batchId,
        string calldata eventType,
        string calldata cid,
        bytes32 dataHash
    ) external {
        bytes32 key = _requireBatch(batchId);
        Batch storage batch = batches[key];
        require(batch.state == BatchState.Active, 'batch not active');
        require(_canWriteBatch(batch, msg.sender), 'not allowed');
        _recordEvent(key, eventType, cid, dataHash);
        emit EventAppended(batchId, msg.sender, eventType, cid, dataHash);
    }

    function appendEvent(
        bytes32 batchId,
        uint8 eventType,
        bytes32 eventHash
    ) external {
        // This function assumes the caller has already verified the event details off-chain
        // and is just recording the hash.
        // It uses the bytes32 batchId directly.
        // We need to verify the batch exists.
        require(batches[batchId].exists, "batch missing");
        
        // Check permissions - similar to _canWriteBatch but using batchId key directly
        Batch storage batch = batches[batchId];
        require(batch.state == BatchState.Active, 'batch not active');
        require(_canWriteBatch(batch, msg.sender), 'not allowed');

        // Map uint8 eventType to string
        string memory eventTypeStr;
        if (eventType == 0) eventTypeStr = "Create";
        else if (eventType == 1) eventTypeStr = "Transport";
        else if (eventType == 2) eventTypeStr = "Inspect";
        else eventTypeStr = "Unknown";

        _recordEvent(batchId, eventTypeStr, "", eventHash);
        // We don't have the string batchId here to emit the original event...
        // But the original event uses string batchId.
        // The README says: "Records a salted event hash for a batch."
        // The original `appendEvent` emits `EventAppended` with string batchId.
        // If we only have bytes32 batchId, we can't emit the string batchId unless we store it in the Batch struct (which we do).
        emit EventAppended(batch.batchId, msg.sender, eventTypeStr, "", eventHash);
    }

    function transferCustody(string calldata batchId, address newCustodian)
        external
        onlyCustodian(batchId)
    {
        require(newCustodian != address(0), 'invalid custodian');
        require(_isAuthorizedWriter(newCustodian), 'custodian must be authorized');
        bytes32 key = _batchKey(batchId);
        Batch storage batch = batches[key];
        require(batch.state == BatchState.Active, 'batch not active');
        address previous = batch.currentCustodian;
        batch.currentCustodian = newCustodian;
        _recordEvent(key, 'TRANSFER', '', bytes32(0));
        emit CustodyTransferred(batchId, previous, newCustodian);
    }

    function setRecall(
        string calldata batchId,
        string calldata reason
    ) external onlyRole(Role.Regulator) {
        bytes32 key = _requireBatch(batchId);
        Batch storage batch = batches[key];
        require(batch.state == BatchState.Active, 'batch not active');
        require(bytes(reason).length > 0, 'reason required');

        batch.state = BatchState.Recalled;
        batch.recallReason = reason;
        _recordEvent(key, "RECALLED", "", bytes32(0));
        emit RecallStatusChanged(batchId, true, reason);
        emit BatchStateChanged(batchId, BatchState.Recalled);
    }

    function _recordEvent(
        bytes32 key,
        string memory eventType,
        string memory cid,
        bytes32 dataHash
    ) internal {
        _batchEvents[key].push(
            EventRecord({
                eventType: eventType,
                actor: msg.sender,
                cid: cid,
                dataHash: dataHash,
                timestamp: block.timestamp
            })
        );
    }

    function _batchKey(string memory batchId) internal pure returns (bytes32) {
        return keccak256(bytes(batchId));
    }

    function _requireBatch(string calldata batchId) internal view returns (bytes32) {
        bytes32 key = _batchKey(batchId);
        require(batches[key].exists, 'batch missing');
        return key;
    }

    function _canWriteBatch(Batch storage batch, address actor) internal view returns (bool) {
        Role role = roles[actor];
        if (role == Role.Regulator) {
            return true;
        }
        return batch.currentCustodian == actor && _isAuthorizedWriter(actor);
    }

    function _isAuthorizedWriter(address account) internal view returns (bool) {
        Role role = roles[account];
        return role == Role.Producer || role == Role.Transporter || role == Role.Retailer;
    }

    modifier onlyRole(Role role) {
        require(roles[msg.sender] == role, 'role required');
        _;
    }

    modifier onlyCustodian(string calldata batchId) {
        bytes32 key = _requireBatch(batchId);
        require(batches[key].currentCustodian == msg.sender, 'not custodian');
        _;
    }

    modifier onlyAdmin() {
        require(owner() == msg.sender || admins[msg.sender], "admin required");
        _;
    }

    function submitCompliance(
        string calldata batchId,
        string calldata condition,
        bool passed
    ) external onlyRole(Role.Inspector) {
        bytes32 key = _requireBatch(batchId);
        compliance[key].push(ComplianceCheck({
            condition: condition,
            passed: passed,
            verifier: msg.sender,
            timestamp: block.timestamp
        }));
        emit ComplianceVerified(batchId, condition, passed);
    }

    function getCompliance(string calldata batchId) 
        external view returns (ComplianceCheck[] memory) {
        bytes32 key = _requireBatch(batchId);
        return compliance[key];
    }
}

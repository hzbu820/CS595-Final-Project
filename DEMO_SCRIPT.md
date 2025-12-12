# Final Presentation Demo Script: The Complete Supply Chain Lifecycle

**Goal:** Demonstrate every feature of the platform, highlighting Role-Based Access Control (RBAC), Chain of Custody, Immutable Logging, Public Transparency, and Technical Verification.

**Roles Needed:**
1.  **Wallet A (Owner):** Acts as **Admin**, **Producer**, and **Regulator**.
2.  **Wallet B (Worker):** Acts as **Transporter**.

---

## Part 1: Governance & Setup (Admin)
*   **Narrative:** "Our system starts with strict governance. Only the Admin can authorize participants."
*   **Action (Wallet A):**
    1.  Go to **Admin** tab.
    2.  Show that Wallet B is currently unauthorized (or has a different role).
    3.  Enter **Wallet B Address**. Select **Transporter**. Click **Grant Role**.
    4.  *Explain:* "We just updated the smart contract's access control list on-chain. This ensures only trusted parties can handle the food."

## Part 2: The Origin (Producer)
*   **Narrative:** "Now, let's start the supply chain. I am the Producer (Farmer)."
*   **Action (Wallet A):**
    1.  Go to **Create Batch**.
    2.  Enter: `Product: Organic Milk`, `Origin: Vermont`, `Temp: 4C`.
    3.  Click **Create Batch**. Sign & Confirm.
    4.  **Copy the Batch ID.**
    5.  *Explain:* "This mints the digital twin of the product. I am now the on-chain custodian. The data is hashed and pinned to IPFS."

## Part 3: Chain of Custody (Producer -> Transporter)
*   **Narrative:** "The truck has arrived. I need to hand over custody securely."
*   **Action (Wallet A):**
    1.  Go to **Transfer Custody**.
    2.  Enter **Batch ID** and **Wallet B Address**.
    3.  Click **Transfer**.
    4.  *Explain:* "Only the current custodian can transfer ownership. This prevents theft and fraud."

## Part 4: Logistics & Data Logging (Transporter)
*   **Narrative:** "Now I am the Truck Driver (Wallet B). I have custody."
*   **Action (Wallet B):**
    1.  Switch MetaMask to **Wallet B**. Refresh page.
    2.  Show that **Admin** tab is gone (RBAC working).
    3.  Go to **Append Event**.
    4.  Enter **Batch ID**. Event: `Transport`. Data: `Temp: 5C, Location: Highway 95`.
    5.  Click **Submit Event**.
    6.  *Explain:* "I'm logging telemetry data. This is hashed and pinned to IPFS, linked to the batch forever."

## Part 5: Quality Control & Recall (Regulator)
*   **Narrative:** "A Regulator audits the system and finds a violation."
*   **Action (Wallet A):**
    1.  Switch MetaMask to **Wallet A**.
    2.  (Optional) Grant yourself **Regulator** role via Admin tab if needed.
    3.  Go to **Regulator** tab. Load the Batch.
    4.  Point out the temperature data from the Transporter.
    5.  **Issue Recall:** Reason: `Temperature exceeded safety limits`.
    6.  *Explain:* "The Regulator has emergency powers to flag unsafe products instantly. This updates the blockchain state globally."

## Part 6: Public Trust (Consumer)
*   **Narrative:** "Finally, the Consumer verifies the product in the store."
*   **Action:**
    1.  Go to **Viewer** tab.
    2.  Enter **Batch ID**. Load.
    3.  Show the **RED RECALL WARNING**.
    4.  Show the full **Timeline** (Create -> Transfer -> Transport -> Recall).

## Part 7: QR Code Integration (Mobile)
*   **Narrative:** "Consumers can also access this data via mobile."
*   **Action:**
    1.  Go to **QR Connect** tab.
    2.  Enter **Batch ID**.
    3.  Show the generated **QR Code**.
    4.  *Explain:* "Scanning this QR code instantly loads the Viewer page for that batch."

## Part 8: Technical Verification (Verify Hashes)
*   **Narrative:** "How do we know the data wasn't faked? We use cryptographic verification."
*   **Action:**
    1.  Go to **Verify Hashes**.
    2.  Load the Batch.
    3.  Click **Verify** on an event.
    4.  Show the "Match: Yes" result.
    5.  *Explain:* "We re-compute the SHA-256 hash of the off-chain JSON and match it against the immutable on-chain hash. It's mathematically proven to be authentic."

## Part 9: Automated System Test (QA)
*   **Narrative:** "To ensure reliability, we have a built-in automated test suite."
*   **Action (Wallet A):**
    1.  Go to **System Test** tab.
    2.  Show the "System Test Passed" result (or run it if you have time).
    3.  *Explain:* "This verifies the entire contract logic automatically."

---

**Conclusion:** "We have built a complete, end-to-end trust layer for supply chains, covering Governance, Logistics, Safety, and Public Verification."

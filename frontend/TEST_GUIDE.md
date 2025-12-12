# Manual Test Guide: Farm-to-Fork Traceability

This guide provides step-by-step instructions to manually verify every feature of the Supply Chain Transparency Portal. You will simulate a real-world scenario where a batch of food moves from a Producer, to a Transporter, to a Retailer, and is finally inspected by a Regulator.

## Prerequisites

1.  **Two MetaMask Wallets:**
    *   **Wallet A (Owner):** The account that deployed the contract. We will use this as **Admin** and **Producer**.
    *   **Wallet B (Worker):** A secondary account. We will use this as **Transporter**.
2.  **Network:** Ensure both wallets are connected to **Sepolia** (or your local Hardhat network).
3.  **App Running:** Ensure the frontend is open at `http://localhost:5173`.

---

## Part 1: Role Setup (Admin)

**Goal:** Grant the "Transporter" role to Wallet B so it can participate.

1.  **Open MetaMask** and switch to **Wallet A (Owner)**.
2.  Refresh the page. Verify the top-right card says **"Role: Producer"** (or whatever you set previously) and you see the **"Admin"** tab in the menu.
3.  Click the **"Admin"** tab.
4.  **Copy Wallet B's Address:**
    *   Open MetaMask, switch to Wallet B, click the "Copy" icon next to the address.
    *   Switch MetaMask back to Wallet A.
5.  **Paste Address:** In the Admin screen, paste Wallet B's address into the "User Address" field.
6.  **Select Role:** Click the dropdown and select **"Transporter"**.
7.  **Grant Role:** Click the **"Grant Role"** button.
8.  **Confirm Transaction:** MetaMask will pop up. Click **"Confirm"**.
9.  **Wait:** Wait for the green success message "Tx: 0x..." to appear at the bottom.

---

## Part 2: Create a Batch (Producer)

**Goal:** Create a new batch of "Organic Apples" as the Producer.

1.  Ensure you are still on **Wallet A**.
2.  Click the **"Create Batch"** tab.
3.  **Fill in the Form:**
    *   **Batch ID:** Leave as default (randomly generated) or type `APPLE-001`. **Copy this ID now!** You will need it later.
    *   **Product:** Type `Organic Apples`.
    *   **Origin:** Type `Washington Farm`.
    *   **Temperature:** Type `4.5`.
4.  **Click "Create Batch"**.
5.  **Sign Message:** MetaMask will ask you to **Sign** a message (EIP-712). This uploads data to the backend. Click **"Sign"**.
6.  **Confirm Transaction:** MetaMask will then ask you to **Confirm** a transaction. This saves the hash to the blockchain. Click **"Confirm"**.
7.  **Success:** Wait for "Batch Created! Tx: 0x..." to appear.

---

## Part 3: Transfer Custody (Producer -> Transporter)

**Goal:** Hand over the apples to the truck driver (Wallet B).

1.  Click the **"Transfer Custody"** tab.
2.  **Batch ID:** Paste the Batch ID you copied earlier (e.g., `APPLE-001`).
3.  **New Custodian:** Paste **Wallet B's Address**.
4.  **Click "Transfer Custody"**.
5.  **Confirm Transaction:** MetaMask popup -> Click **"Confirm"**.
6.  **Success:** Wait for the transaction confirmation.

---

## Part 4: Transport & Append Event (Transporter)

**Goal:** The truck driver (Wallet B) records that they received the goods.

1.  **Switch MetaMask** to **Wallet B**.
2.  Refresh the page.
    *   **Verify:** The top-right card should now say **"Role: Transporter"**.
    *   **Verify:** The "Admin" tab should **disappear**.
3.  Click the **"Append Event"** tab.
4.  **Batch ID:** Paste the Batch ID (`APPLE-001`).
5.  **Event Type:** Select **"Transport"** (or type it if it's a text box).
6.  **Data:**
    *   **Location:** `Interstate 5`.
    *   **Temperature:** `5.0`.
    *   **Note:** `In transit to Seattle`.
7.  **Click "Submit Event"**.
8.  **Sign:** MetaMask popup -> Click **"Sign"**.
9.  **Confirm:** MetaMask popup -> Click **"Confirm"**.
10. **Success:** Wait for "Event Appended!".

---

## Part 5: Regulator Inspection & Recall (Regulator)

**Goal:** You (Wallet A) act as a Regulator, find a problem, and recall the batch.

1.  **Switch MetaMask** back to **Wallet A**.
2.  **Grant Yourself Regulator Role:**
    *   Go to **"Admin"** tab.
    *   Paste **Wallet A's Address** (your own).
    *   Select Role: **"Regulator"**.
    *   Click **"Grant Role"** and Confirm.
    *   *Note: You are now a Regulator.*
3.  Refresh the page. Top-right should say **"Role: Regulator"**.
4.  Click the **"Regulator"** tab.
5.  **Batch ID:** Paste the Batch ID (`APPLE-001`).
6.  **Click "Load Batch"**.
    *   Review the history. You should see "Create" (by Wallet A) and "Transport" (by Wallet B).
7.  **Issue Recall:**
    *   Scroll down to the "Recall" section (or go to **"Recall"** tab).
    *   **Reason:** Type `Temperature spike detected`.
    *   **Click "Update Recall Status"**.
    *   **Confirm:** MetaMask popup -> Click **"Confirm"**.

---

## Part 6: Public Verification (Consumer)

**Goal:** Verify the recall is visible to the public.

1.  **Disconnect Wallet** (optional, or just use incognito window). Or just stay logged in, it works for everyone.
2.  Click the **"Viewer"** tab.
3.  **Batch ID:** Paste the Batch ID (`APPLE-001`).
4.  **Click "Load Batch"**.
5.  **Verify:**
    *   Look at the **Summary** section.
    *   It should say **"Recall Status: Recalled (Temperature spike detected)"** in red text.
    *   You should see the full timeline of events.

---

## Part 7: QR Code Connect (Mobile/Kiosk)

**Goal:** Generate a QR code for easy mobile access.

1.  Click the **"QR Connect"** tab.
2.  **Generate:**
    *   **Batch ID:** Paste `APPLE-001`.
    *   **CID:** (Optional) Leave blank.
    *   **Salted Hash:** (Optional) Leave blank.
    *   **Verify:** A QR code appears on the screen.
3.  **Scan (Optional):**
    *   If you have a mobile device or webcam, click **"Start Scanner"**.
    *   Hold the QR code up to the camera.
    *   **Verify:** The scanner reads the JSON payload and displays it.

---

## Part 8: Technical Verification (Verify Hashes)

**Goal:** Cryptographically prove that the data hasn't been tampered with.

1.  Click the **"Verify Hashes"** tab.
2.  **Batch ID:** Paste `APPLE-001`.
3.  **Click "Load Batch"**.
4.  **Verify Event:**
    *   Find the "Transport" event in the list.
    *   Click the **"Verify"** button next to it.
5.  **Result:**
    *   Wait for the backend to re-compute the hash.
    *   **Verify:** You should see a green message: **"Match: Yes"**.
    *   *Explanation:* This proves the off-chain JSON matches the on-chain hash.

---

## Part 9: Automated System Test

**Goal:** Run the built-in integration test suite.

1.  **Switch MetaMask** back to **Wallet A (Owner)**.
2.  Click the **"System Test"** tab.
    *   *Note: This tab is only visible to the Admin.*
3.  **Click "Run System Test"**.
4.  **Follow the Prompts:**
    *   MetaMask will pop up multiple times (Sign -> Confirm -> Sign -> Confirm).
    *   Approve all transactions.
5.  **Verify:**
    *   Watch the progress bars turn green.
    *   **Final Result:** "System Test Passed".

**Test Complete!** You have successfully verified the entire lifecycle of the application.

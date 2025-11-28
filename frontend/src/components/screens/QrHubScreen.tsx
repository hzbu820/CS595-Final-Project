import { useEffect, useId, useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Html5QrcodeScanner } from 'html5-qrcode';

type ScanPayload = {
  batchId?: string;
  cid?: string;
  saltedHash?: string;
  note?: string;
};

export const QrHubScreen = () => {
  const [batchId, setBatchId] = useState('0xBATCHID...');
  const [cid, setCid] = useState('');
  const [saltedHash, setSaltedHash] = useState('');
  const [scanEnabled, setScanEnabled] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const rawId = useId();
  const readerId = useMemo(() => `qr-reader-${rawId.replace(/:/g, '')}`, [rawId]);

  const payload: ScanPayload = useMemo(
    () => ({
      batchId,
      cid,
      saltedHash,
      note: 'Share this QR with the mobile app to autofill batch lookups.',
    }),
    [batchId, cid, saltedHash],
  );

  useEffect(() => {
    if (!scanEnabled) return undefined;
    const scanner = new Html5QrcodeScanner(
      readerId,
      { fps: 8, qrbox: { width: 240, height: 240 } },
      false,
    );
    scanner.render(
      (text: string) => {
        setScanResult(text);
        setScanError(null);
        try {
          const parsed = JSON.parse(text) as ScanPayload;
          if (parsed.batchId) setBatchId(parsed.batchId);
          if (parsed.cid) setCid(parsed.cid);
          if (parsed.saltedHash) setSaltedHash(parsed.saltedHash);
        } catch {
          /* ignore plain text */
        }
      },
      (err: unknown) => {
        const message = typeof err === 'string' ? err : err?.toString?.() ?? 'Scan error';
        setScanError(message);
      },
    );
    return () => {
      scanner.clear().catch(() => undefined);
    };
  }, [scanEnabled, readerId]);

  return (
    <div className="screen-card form">
      <h2>QR Connect</h2>
      <p className="screen-description">
        Generate a QR payload containing batch info, or scan a QR from the mobile client to autofill batch lookups and
        event submissions. This is handy for warehouse kiosks or driver check-ins.
      </p>

      <div className="qr-grid">
        <div className="qr-panel">
          <h3>Generate</h3>
          <label>
            Batch ID
            <input value={batchId} onChange={(e) => setBatchId(e.target.value)} placeholder="0x..." />
          </label>
          <label>
            CID (optional)
            <input value={cid} onChange={(e) => setCid(e.target.value)} placeholder="cid or filename" />
          </label>
          <label>
            Salted Hash (optional)
            <input
              value={saltedHash}
              onChange={(e) => setSaltedHash(e.target.value)}
              placeholder="0x salted hash"
            />
          </label>
          <div className="qr-preview">
            <QRCodeCanvas value={JSON.stringify(payload)} size={180} includeMargin />
          </div>
        </div>

        <div className="qr-panel">
          <h3>Scan</h3>
          <p className="screen-description">Use your device camera to pull batch metadata from another screen.</p>
          <div className="scan-actions">
            <button
              className="primary"
              type="button"
              onClick={() => setScanEnabled((prev) => !prev)}
            >
              {scanEnabled ? 'Stop Scanner' : 'Start Scanner'}
            </button>
            {scanResult && <span className="success">Last scan: {scanResult.slice(0, 64)}...</span>}
            {scanError && <span className="error">Scanner: {scanError}</span>}
          </div>
          {scanEnabled && <div id={readerId} className="qr-reader" />}
        </div>
      </div>
    </div>
  );
};

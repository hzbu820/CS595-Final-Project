import { useEffect, useId, useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Html5QrcodeScanner } from 'html5-qrcode';

type ScanPayload = {
  batchId?: string;
  note?: string;
};

export const QrHubScreen = () => {
  const [batchId, setBatchId] = useState('0x');
  const [scanEnabled, setScanEnabled] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const rawId = useId();
  const readerId = useMemo(() => `qr-reader-${rawId.replace(/:/g, '')}`, [rawId]);

  const payload: ScanPayload = useMemo(
    () => ({
      batchId,
      note: 'Scan to pre-fill batch summary lookups.',
    }),
    [batchId],
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
        Generate a QR code for a batch ID, or scan one from another device to autofill batch summary lookups in the
        Viewer screen. This mimics how a mobile app could jump directly to a specific batch.
      </p>

      <div className="qr-grid">
        <div className="qr-panel">
          <h3>Generate</h3>
          <label>
            Batch ID
            <input
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              placeholder="0x + 64 hex (same as Viewer)"
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

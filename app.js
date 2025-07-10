
const { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext } = React;

// --- Constants ---
const futureAssets = [
  "BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "XRP/USDT", "DOGE/USDT", "ADA/USDT", "AVAX/USDT", "SHIB/USDT", "DOT/USDT", "LINK/USDT", "MATIC/USDT", "TRX/USDT", "LTC/USDT", "BCH/USDT", "NEAR/USDT", "UNI/USDT", "ICP/USDT", "APT/USDT", "ETC/USDT", "FIL/USDT", "ATOM/USDT", "XLM/USDT", "HBAR/USDT", "OP/USDT", "ARB/USDT", "VET/USDT", "SUI/USDT", "MKR/USDT", "AAVE/USDT","FTM/USDT", "RUNE/USDT", "INJ/USDT", "TIA/USDT", "SEI/USDT", "GRT/USDT","GALA/USDT", "RNDR/USDT", "FET/USDT", "SAND/USDT"
];
const forexAssets = ["1000PEPE/USDT", "WIF/USDT", "ORDI/USDT", "1000BONK/USDT", "STX/USDT", "IMX/USDT","MINA/USDT", "AXS/USDT", "APE/USDT", "MANA/USDT", "DYDX/USDT", "CRV/USDT","LDO/USDT", "EOS/USDT", "FLOW/USDT", "KSM/USDT", "ZEC/USDT", "XTZ/USDT","IOTA/USDT", "WAVES/USDT", "THETA/USDT", "CHZ/USDT", "ENJ/USDT", "COMP/USDT"];

const defaultSettings = {
  tp: 1.5, sl: 1, period: 20, calculationBase: 'Normal', analysisTimeframe: '1h', confirmationTimeframe: '15m', trailingStopEnabled: false, trailingStopPercentage: 0.5, useVolumeConfirmation: false, volumeLookback: 20, useRsiConfirmation: false, rsiPeriod: 14, rsiOverbought: 70, rsiOversold: 30, useMacdConfirmation: false, macdFast: 12, macdSlow: 26, macdSignal: 9,
};

const BINANCE_FUTURES_API_URL = 'https://fapi.binance.com';

// --- Services ---
function hmac_sha256(key, data) {
    const shaObj = new jsSHA("SHA-256", "TEXT");
    shaObj.setHMACKey(key, "TEXT");
    shaObj.update(data);
    return shaObj.getHMAC("HEX");
}
const XOR_SECRET_KEY = 'default-secret-key-for-prototyping';
function xorEncrypt(text, key) { let result = ''; for (let i = 0; i < text.length; i++) { result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length)); } return result; }
function encrypt(text) { const encrypted = xorEncrypt(text, XOR_SECRET_KEY); return btoa(encrypted); }
function decrypt(encryptedText) { try { const decoded = atob(encryptedText); return xorEncrypt(decoded, XOR_SECRET_KEY); } catch (e) { console.error("Decryption failed:", e); return ""; } }

async function getOpenPositionsStatic(apiKey, secretKey) {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = hmac_sha256(secretKey, queryString);
    const url = `${BINANCE_FUTURES_API_URL}/fapi/v2/positionRisk?${queryString}&signature=${signature}`;
    try {
        const response = await fetch(url, { method: 'GET', headers: { 'X-MBX-APIKEY': apiKey, 'Content-Type': 'application/json' } });
        if (!response.ok) { const errorData = await response.json(); throw new Error(`Binance API Error: ${errorData.msg} (Code: ${errorData.code})`); }
        const data = await response.json();
        return data.filter(p => parseFloat(p.positionAmt) !== 0);
    } catch (error) { console.error("Error fetching Binance positions:", error); throw error; }
}

const calculateTR = (high, low, prevClose) => Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
const calculateArraySMA = (data) => data.length === 0 ? 0 : data.reduce((acc, val) => acc + val, 0) / data.length;
const calculateMovingVWAP = (klines, period) => {
  if (klines.length < period) return [];
  const vwapData = [];
  for (let i = period - 1; i < klines.length; i++) {
    const window = klines.slice(i - period + 1, i + 1);
    let cumulativeTPV = 0; let cumulativeVolume = 0;
    for (const kline of window) {
      const typicalPrice = (kline.high + kline.low + kline.close) / 3;
      cumulativeTPV += typicalPrice * kline.volume;
      cumulativeVolume += kline.volume;
    }
    const vwap = cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : 0;
    if (vwap > 0) vwapData.push({ time: klines[i].time, value: vwap });
  }
  return vwapData;
};


// --- UI Components ---
function Icon({ name, className }) {
    useEffect(() => { lucide.createIcons(); }, [name]);
    return React.createElement('i', { 'data-lucide': name, className });
}

function InstallPwaButton() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isAppInstalled, setIsAppInstalled] = useState(false);
    useEffect(() => {
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) { setIsAppInstalled(true); return; }
        const handleBeforeInstallPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);
    const handleInstallClick = () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => { setDeferredPrompt(null); });
    };
    if (isAppInstalled || !deferredPrompt) return null;
    return React.createElement('button', { onClick: handleInstallClick, className: 'button primary w-full flex items-center justify-center' }, React.createElement(Icon, { name: 'download-cloud', className: 'mr-2' }), 'Install App');
}

function PositionCard({ position }) {
    const isLong = parseFloat(position.positionAmt) > 0;
    const pnl = parseFloat(position.unRealizedProfit);
    const isProfitable = pnl > 0;
    const assetName = position.symbol.replace('USDT', '/USDT');
    return React.createElement('div', { className: `card border-2 ${isLong ? 'border-green-500/30' : 'border-red-500/30'}` },
        React.createElement('div', { className: 'card-header' },
            React.createElement('div', { className: 'flex justify-between items-start' },
                React.createElement('div', null,
                    React.createElement('h3', { className: 'card-title flex items-center gap-2' },
                        isLong ? React.createElement(Icon, { name: 'trending-up', className: 'text-green-500' }) : React.createElement(Icon, { name: 'trending-down', className: 'text-red-500' }),
                        assetName),
                    React.createElement('div', { className: 'flex items-center gap-2 flex-wrap mt-1' },
                        React.createElement('span', { className: `badge outline ${isLong ? 'text-green-500' : 'text-red-500'}` }, isLong ? 'LONG' : 'SHORT'),
                        React.createElement('span', { className: 'badge secondary' }, `${position.leverage}x`))))),
        React.createElement('div', { className: 'card-content space-y-3 text-sm' },
            React.createElement('div', { className: 'flex justify-between' }, React.createElement('span', { className: 'text-muted-foreground' }, 'Unrealized PNL'), React.createElement('span', { className: `font-semibold ${isProfitable ? 'text-green-500' : 'text-red-500'}` }, `${pnl.toFixed(2)} USDT`)),
            React.createElement('div', { className: 'flex justify-between' }, React.createElement('span', { className: 'text-muted-foreground' }, 'Size'), React.createElement('span', { className: 'font-semibold' }, position.positionAmt)),
            React.createElement('div', { className: 'flex justify-between' }, React.createElement('span', { className: 'text-muted-foreground' }, 'Entry Price'), React.createElement('span', { className: 'font-semibold' }, parseFloat(position.entryPrice).toFixed(4))),
            React.createElement('div', { className: 'flex justify-between' }, React.createElement('span', { className: 'text-muted-foreground' }, 'Mark Price'), React.createElement('span', { className: 'font-semibold' }, parseFloat(position.markPrice).toFixed(4))))
    );
}

function PositionsTab({ profile }) {
    const [positions, setPositions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchPositions = useCallback(async () => {
        if (!profile) return;
        const storedKeys = localStorage.getItem(`binance_api_${profile}`);
        if (!storedKeys) { setError('Binance API keys not found. Please connect your account.'); setIsLoading(false); return; }
        try {
            const { encryptedApiKey, encryptedSecretKey } = JSON.parse(storedKeys);
            const apiKey = decrypt(encryptedApiKey);
            const secretKey = decrypt(encryptedSecretKey);
            if (!apiKey || !secretKey) { throw new Error("Failed to decrypt keys."); }
            setIsLoading(true); setError(null);
            const openPositions = await getOpenPositionsStatic(apiKey, secretKey);
            setPositions(openPositions);
        } catch (err) { setError(err.message); } finally { setIsLoading(false); }
    }, [profile]);
    useEffect(() => { fetchPositions(); const interval = setInterval(fetchPositions, 30000); return () => clearInterval(interval); }, [fetchPositions]);
    return React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-header' }, React.createElement('h2', { className: 'card-title' }, 'Live Binance Positions'), React.createElement('p', { className: 'card-description' }, 'Your current open positions on Binance Futures.')),
        React.createElement('div', { className: 'card-content' },
            error && React.createElement('div', { className: 'alert destructive' }, `Error: ${error}`),
            isLoading && React.createElement('p', null, 'Loading positions...'),
            !isLoading && !error && positions.length === 0 && React.createElement('p', null, 'No open positions found.'),
            !isLoading && !error && positions.length > 0 && React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' },
                positions.map(pos => React.createElement(PositionCard, { key: pos.symbol, position: pos })))
        ));
}

function BinanceConnectDialog({ profileName, isOpen, setIsOpen, onConnect }) {
    const [apiKey, setApiKey] = useState("");
    const [secretKey, setSecretKey] = useState("");
    const [isConnected, setIsConnected] = useState(false);
    const [showKeys, setShowKeys] = useState(false);

    const getStorageKey = () => `binance_api_${profileName}`;

    useEffect(() => {
        if (isOpen) {
            setShowKeys(false); // Reset on open
            const storedKeys = localStorage.getItem(getStorageKey());
            if (storedKeys) {
                try {
                    const { encryptedApiKey, encryptedSecretKey } = JSON.parse(storedKeys);
                    const decryptedApi = decrypt(encryptedApiKey);
                    const decryptedSecret = decrypt(encryptedSecretKey);
                    if (decryptedApi && decryptedSecret) {
                        setApiKey(decryptedApi);
                        setSecretKey(decryptedSecret);
                        setIsConnected(true);
                    }
                } catch (e) {
                    console.error('Failed to load Binance keys', e);
                    setIsConnected(false);
                    setApiKey("");
                    setSecretKey("");
                }
            } else {
                setIsConnected(false);
                setApiKey("");
                setSecretKey("");
            }
        }
    }, [isOpen, profileName]);

    const handleConnect = () => {
        if (!apiKey || !secretKey) { alert("Please provide both API Key and Secret Key."); return; }
        const encryptedApiKey = encrypt(apiKey);
        const encryptedSecretKey = encrypt(secretKey);
        localStorage.setItem(getStorageKey(), JSON.stringify({ encryptedApiKey, encryptedSecretKey }));
        setIsConnected(true);
        setShowKeys(false);
        alert("Connection Successful. Keys saved in local storage.");
        onConnect();
    };

    const handleDisconnect = () => {
        localStorage.removeItem(getStorageKey());
        setIsConnected(false);
        setApiKey("");
        setSecretKey("");
        setShowKeys(false);
        alert("Disconnected. Your keys have been removed.");
    };

    const handleCopy = (text, type) => {
        navigator.clipboard.writeText(text).then(() => {
            alert(`${type} copied to clipboard.`);
        }).catch(err => {
            alert(`Failed to copy ${type}.`);
        });
    };

    if (!isOpen) return null;

    const connectedContent = React.createElement('div', { className: 'space-y-4 p-4 border rounded-md bg-muted/50' },
        React.createElement('div', { className: 'flex items-center justify-between gap-2 text-green-500' },
            React.createElement('div', { className: 'flex items-center gap-2' },
                React.createElement(Icon, { name: 'check-circle', className: 'h-5 w-5' }),
                React.createElement('p', { className: 'font-semibold' }, 'Successfully Connected')
            ),
            React.createElement('button', { className: 'button ghost', onClick: () => setShowKeys(!showKeys) },
                React.createElement(Icon, { name: showKeys ? 'eye-off' : 'eye', className: 'h-4 w-4' })
            )
        ),
        showKeys && React.createElement('div', { className: 'space-y-4' },
            React.createElement('div', null,
                React.createElement('label', { htmlFor: 'api-key-display', className: 'label' }, 'API Key'),
                React.createElement('div', { className: 'flex items-center gap-2' },
                    React.createElement('input', { id: 'api-key-display', value: apiKey, readOnly: true, className: 'input' }),
                    React.createElement('button', { className: 'button outline', onClick: () => handleCopy(apiKey, 'API Key') }, React.createElement(Icon, { name: 'copy', className: 'h-4 w-4' }))
                )
            ),
            React.createElement('div', null,
                React.createElement('label', { htmlFor: 'secret-key-display', className: 'label' }, 'Secret Key'),
                 React.createElement('div', { className: 'flex items-center gap-2' },
                    React.createElement('input', { id: 'secret-key-display', type: 'password', value: secretKey, readOnly: true, className: 'input' }),
                    React.createElement('button', { className: 'button outline', onClick: () => handleCopy(secretKey, 'Secret Key') }, React.createElement(Icon, { name: 'copy', className: 'h-4 w-4' }))
                )
            )
        ),
        React.createElement('button', { onClick: handleDisconnect, className: 'button destructive w-full' }, 'Disconnect')
    );

    const disconnectedContent = React.createElement('div', { className: 'space-y-4' },
        React.createElement('div', { className: 'space-y-2' },
            React.createElement('label', { htmlFor: 'api-key', className: 'label' }, 'API Key'),
            React.createElement('input', { id: 'api-key', value: apiKey, onChange: (e) => setApiKey(e.target.value), placeholder: 'Enter your Binance API Key', className: 'input' })
        ),
        React.createElement('div', { className: 'space-y-2' },
            React.createElement('label', { htmlFor: 'secret-key', className: 'label' }, 'Secret Key'),
            React.createElement('input', { id: 'secret-key', type: 'password', value: secretKey, onChange: (e) => setSecretKey(e.target.value), placeholder: 'Enter your Binance Secret Key', className: 'input' })
        )
    );

    return React.createElement('div', { className: 'dialog-overlay' },
        React.createElement('div', { className: 'dialog-content' },
            React.createElement('div', { className: 'dialog-header' },
                React.createElement('h2', { className: 'dialog-title' }, 'Connect to Binance'),
                React.createElement('p', { className: 'dialog-description' }, 'Enter your API keys for read-only access.')
            ),
            React.createElement('div', { className: 'py-4 space-y-4' },
                React.createElement('div', { className: 'alert destructive' },
                    React.createElement(Icon, { name: 'alert-triangle', className: 'h-4 w-4' }),
                    React.createElement('h3', { className: 'font-bold' }, 'Security Warning'),
                    React.createElement('p', null, 'Only use API keys with "Read-only" permissions. Keys are stored in your browser\'s local storage.')
                ),
                isConnected ? connectedContent : disconnectedContent
            ),
            React.createElement('div', { className: 'dialog-footer' },
                React.createElement('button', { onClick: () => setIsOpen(false), className: 'button outline' }, 'Cancel'),
                !isConnected && React.createElement('button', { onClick: handleConnect, className: 'button primary' }, 'Connect')
            )
        )
    );
}

function LandingPage() {
    const [profile, setProfile] = useState(null);
    useEffect(() => {
        const activeProfile = localStorage.getItem('scalp_pro_active_profile');
        if (activeProfile) { setProfile(activeProfile); }
    }, []);
    if (profile) { return React.createElement(DashboardPage, { initialProfile: profile }); }
    return React.createElement(ProfileSelector);
}

function ProfileSelector() {
    const [profileName, setProfileName] = useState('');
    const [profiles, setProfiles] = useState([]);
    useEffect(() => {
        const storedProfiles = localStorage.getItem('scalp_pro_profiles');
        if (storedProfiles) setProfiles(JSON.parse(storedProfiles));
    }, []);
    const handleCreate = () => {
        if (!profileName.trim() || profiles.includes(profileName.trim())) { alert("Invalid or duplicate profile name."); return; }
        const updatedProfiles = [...profiles, profileName.trim()];
        setProfiles(updatedProfiles);
        localStorage.setItem('scalp_pro_profiles', JSON.stringify(updatedProfiles));
        localStorage.setItem(`scalp_pro_profile_${profileName.trim()}`, JSON.stringify({ trades: [], settings: defaultSettings }));
        localStorage.setItem('scalp_pro_active_profile', profileName.trim());
        window.location.reload();
    };
    const handleLoad = (name) => {
        localStorage.setItem('scalp_pro_active_profile', name);
        window.location.reload();
    };
    return React.createElement('div', { className: 'flex items-center justify-center min-h-screen bg-background text-foreground' },
        React.createElement('div', { className: 'w-full max-w-md mx-4 space-y-6' },
            React.createElement('div', { className: 'text-center' }, React.createElement('h1', { className: 'text-3xl font-bold' }, 'SCALP PRO'), React.createElement('p', { className: 'text-muted-foreground' }, 'Create or load a profile.')),
            React.createElement('div', { className: 'card p-6' },
                React.createElement('h3', { className: 'font-semibold mb-4' }, 'New Profile'),
                React.createElement('input', { className: 'input mb-2', placeholder: "Profile Name", value: profileName, onChange: e => setProfileName(e.target.value) }),
                React.createElement('button', { className: 'button primary w-full', onClick: handleCreate }, 'Create & Load')),
            profiles.length > 0 && React.createElement('div', { className: 'card p-6' },
                React.createElement('h3', { className: 'font-semibold mb-4' }, 'Load Profile'),
                profiles.map(p => React.createElement('button', { key: p, className: 'button outline w-full mb-2', onClick: () => handleLoad(p) }, p))),
            React.createElement(InstallPwaButton, null)));
}

function DashboardPage({ initialProfile }) {
    const [profile, setProfile] = useState(initialProfile);
    const [isBinanceModalOpen, setIsBinanceModalOpen] = useState(false);
    useEffect(() => {
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => { console.log('Notification permission:', permission); });
        }
    }, []);
    const handleConnect = () => { setIsBinanceModalOpen(false); window.location.reload(); };
    const handleLogout = () => { localStorage.removeItem('scalp_pro_active_profile'); setProfile(null); window.location.reload(); };
    if (!profile) return React.createElement(ProfileSelector);
    return React.createElement('div', { className: 'flex flex-col h-screen bg-background text-foreground' },
        React.createElement(BinanceConnectDialog, { profileName: profile, isOpen: isBinanceModalOpen, setIsOpen: setIsBinanceModalOpen, onConnect: handleConnect }),
        React.createElement('header', { className: 'p-4 border-b flex justify-between items-center' },
            React.createElement('h1', { className: 'text-xl font-bold' }, `SCALP PRO (Static) - ${profile}`),
            React.createElement('div', { className: 'flex gap-2' },
                React.createElement('button', { onClick: () => setIsBinanceModalOpen(true), className: 'button outline' }, 'Connect Binance'),
                React.createElement('button', { onClick: handleLogout, className: 'button destructive' }, 'Logout'))),
        React.createElement('main', { className: 'flex-1 overflow-y-auto p-4' },
            React.createElement(PositionsTab, { profile: profile })));
}

function App() {
    const [online, setOnline] = useState(navigator.onLine);
    useEffect(() => {
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(reg => console.log('SW registered!', reg))
                    .catch(err => console.log('SW registration failed: ', err));
            });
        }
        return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
    }, []);
    if (!online) {
        return React.createElement('div', { className: 'flex flex-col items-center justify-center min-h-screen bg-background text-foreground' },
            React.createElement(Icon, { name: 'wifi-off', className: 'w-16 h-16 text-destructive' }),
            React.createElement('h1', { className: 'text-2xl font-bold mt-4' }, 'Connection Error'),
            React.createElement('p', { className: 'text-muted-foreground' }, 'This application requires an internet connection to function.'));
    }
    return React.createElement(LandingPage);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
